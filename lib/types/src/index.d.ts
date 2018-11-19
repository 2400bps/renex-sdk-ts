import BigNumber from "bignumber.js";
import Web3 from "web3";
import { BN } from "bn.js";
import { PromiEvent, Provider } from "web3/types";
import { NetworkData } from "./lib/network";
import { StorageProvider } from "./storage/interface";
import { AtomicBalanceDetails, AtomicConnectionStatus, BalanceAction, BalanceDetails, Config, MarketDetails, MatchDetails, NumberInput, Options, Order, OrderbookFilter, OrderInputs, OrderStatus, SimpleConsole, TokenCode, TraderOrder, Transaction, TransactionStatus } from "./types";
import { DarknodeRegistryContract } from "./contracts/bindings/darknode_registry";
import { ERC20Contract } from "./contracts/bindings/erc20";
import { OrderbookContract } from "./contracts/bindings/orderbook";
import { RenExBalancesContract } from "./contracts/bindings/ren_ex_balances";
import { RenExSettlementContract } from "./contracts/bindings/ren_ex_settlement";
import { RenExTokensContract } from "./contracts/bindings/ren_ex_tokens";
import { WyreContract } from "./contracts/bindings/wyre";
export * from "./types";
export { StorageProvider } from "./storage/interface";
/**
 * This is the concrete class that implements the IRenExSDK interface.
 *
 * @class RenExSDK
 */
declare class RenExSDK {
    _networkData: NetworkData;
    _atomConnectionStatus: AtomicConnectionStatus;
    _atomConnectedAddress: string;
    _storage: StorageProvider;
    _contracts: {
        renExSettlement: RenExSettlementContract;
        renExTokens: RenExTokensContract;
        renExBalances: RenExBalancesContract;
        orderbook: OrderbookContract;
        darknodeRegistry: DarknodeRegistryContract;
        erc20: Map<TokenCode, ERC20Contract>;
        wyre: WyreContract;
    };
    _cachedTokenDetails: Map<TokenCode, Promise<{
        addr: string;
        decimals: string | number | BN;
        registered: boolean;
    }>>;
    atom: {
        getStatus: () => AtomicConnectionStatus;
        isConnected: () => boolean;
        refreshStatus: () => Promise<AtomicConnectionStatus>;
        resetStatus: () => Promise<AtomicConnectionStatus>;
        authorize: () => Promise<AtomicConnectionStatus>;
        fetchBalances: (tokens: string[]) => Promise<Map<string, AtomicBalanceDetails>>;
        fetchAddresses: (tokens: string[]) => Promise<string[]>;
    };
    utils: {
        normalizePrice: (price: NumberInput, roundUp?: boolean | undefined) => NumberInput;
        normalizeVolume: (volume: NumberInput, roundUp?: boolean | undefined) => NumberInput;
        normalizeOrder: (order: OrderInputs) => OrderInputs;
    };
    private _web3;
    private _address;
    private _config;
    /**
     * Creates an instance of RenExSDK.
     * @param {Provider} provider
     * @memberof RenExSDK
     */
    constructor(provider: Provider, options?: Options);
    fetchBalances: (tokens: string[]) => Promise<Map<string, BalanceDetails>>;
    fetchBalanceActionStatus: (txHash: string) => Promise<TransactionStatus>;
    fetchOrderStatus: (orderID: string) => Promise<OrderStatus>;
    fetchMatchDetails: (orderID: string) => Promise<MatchDetails>;
    fetchOrderbook: (filter: OrderbookFilter) => Promise<Order[]>;
    fetchOrderBlockNumber: (orderID: string) => Promise<number>;
    fetchMarkets: () => Promise<MarketDetails[]>;
    fetchSupportedTokens: () => Promise<string[]>;
    fetchSupportedAtomicTokens: () => Promise<string[]>;
    deposit: (value: NumberInput, token: string) => Promise<{
        balanceAction: BalanceAction;
        promiEvent: PromiEvent<Transaction> | null;
    }>;
    withdraw: (value: NumberInput, token: string, withoutIngressSignature?: boolean) => Promise<{
        balanceAction: BalanceAction;
        promiEvent: PromiEvent<Transaction> | null;
    }>;
    openOrder: (order: OrderInputs, simpleConsole?: SimpleConsole | undefined) => Promise<{
        traderOrder: TraderOrder;
        promiEvent: PromiEvent<Transaction> | null;
    }>;
    cancelOrder: (orderID: string) => Promise<{
        promiEvent: PromiEvent<Transaction> | null;
    }>;
    fetchDarknodeFeePercent: () => Promise<BigNumber>;
    fetchMinEthTradeVolume: () => Promise<BigNumber>;
    fetchGasPrice: () => Promise<number | undefined>;
    fetchTraderOrders: (options?: {
        refresh: boolean;
    }) => Promise<TraderOrder[]>;
    fetchBalanceActions: (options?: {
        refresh: boolean;
    }) => Promise<BalanceAction[]>;
    refreshBalanceActionStatuses: () => Promise<Map<string, TransactionStatus>>;
    refreshOrderStatuses: () => Promise<Map<string, OrderStatus>>;
    getWeb3: () => Web3;
    getAddress: () => string;
    getConfig: () => Config;
    setAddress: (address: string) => void;
    updateProvider: (provider: Provider) => void;
}
export default RenExSDK;
