import { BN } from "bn.js";

import RenExSDK, { IntInput } from "@Root/index";

import { ERC20, RenExBalances, RenExTokens, withProvider } from "@Contracts/contracts";
import { ErrCanceledByUser, ErrFailedDeposit, ErrInsufficientFunds } from "@Lib/errors";
import { NetworkData } from "@Lib/network";

const tokenIsEthereum = (token: { addr: string, decimals: IntInput, registered: boolean }) => {
    const ETH_ADDR = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    return token.addr.toLowerCase() === ETH_ADDR.toLowerCase();
};

export const deposit = async (sdk: RenExSDK, token: number, value: IntInput): Promise<void> => {
    console.log(sdk.address);
    console.log(sdk.web3.eth.getAccounts(console.log));

    value = new BN(value);

    sdk.contracts.renExBalances = sdk.contracts.renExBalances || await withProvider(sdk.web3, RenExBalances).at(NetworkData.contracts[0].renExBalances);
    sdk.contracts.renExTokens = sdk.contracts.renExTokens || await withProvider(sdk.web3, RenExTokens).at(NetworkData.contracts[0].renExTokens);
    const tokenDetails = (await sdk.contracts.renExTokens.tokens(token));

    console.log(tokenDetails);
    try {
        if (tokenIsEthereum(tokenDetails)) {
            sdk.contracts.renExBalances.deposit(tokenDetails.addr, value, { value: value.toString(), from: sdk.address });
        } else {
            // ERC20 token
            const tokenContract = await ERC20.at(tokenDetails.addr);

            // If allowance is less than amount, user must first approve
            // TODO: This may cause the transaction to fail if the user call this
            // twice in a row rapidly (after already having an allowance set)
            // There's no way to check pending state - alternative is to see
            // if there are any pending deposits for the same token
            const allowance = new BN(await tokenContract.allowance(sdk.address, sdk.contracts.renExBalances.address, { from: sdk.address }));
            if (allowance.lt(value)) {
                await tokenContract.approve(sdk.contracts.renExBalances.address, value, { from: sdk.address });
            }
            await sdk.contracts.renExBalances.deposit(
                tokenDetails.addr,
                value,
                {
                    // Manually set gas limit since gas estimation won't work
                    // if the ethereum node hasn't seen the previous transaction
                    from: sdk.address,
                    gas: "150000",
                    value: value.toString(),
                }
            );
            // See https://github.com/MetaMask/metamask-extension/issues/3425
        }
    } catch (error) {
        if (error.message.match("Insufficient funds")) {
            throw new Error(ErrInsufficientFunds);
        }
        if (error.message.match("User denied transaction signature")) {
            throw new Error(ErrCanceledByUser);
        }
        console.error(error);
        throw new Error(ErrFailedDeposit);
    }
};
