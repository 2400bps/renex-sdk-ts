import * as contract from "truffle-contract";

import { NetworkData } from "@Lib/network";

import { RenExSettlementArtifact } from "@Bindings/ren_ex_settlement";
import { OrderbookArtifact } from "@Bindings/orderbook";
import { DarknodeRegistryArtifact } from "@Bindings/darknode_registry";
import { RenExBalancesArtifact } from "@Bindings/ren_ex_balances";
import { RenExAtomicInfoArtifact } from "@Bindings/ren_ex_atomic_info";

// Do not use any tsconfig paths here
import DarknodeRegistryJSON from "./ABIs/DarknodeRegistry.json";
import ERC20JSON from "./ABIs/ERC20.json";
import OrderbookJSON from "./ABIs/Orderbook.json";
import RenExSettlementJSON from "./ABIs/RenExSettlement.json";
import RenExBalancesJSON from "./ABIs/RenExBalances.json";
import RenExAtomicInfoJSON from "./ABIs/RenExAtomicInfo.json";

export const ERC20 = contract.default({
    abi: ERC20JSON,
    address: ""
});

export const DarknodeRegistry: DarknodeRegistryArtifact = contract.default({
    abi: DarknodeRegistryJSON,
    address: NetworkData.contracts[0].darknodeRegistry,
});

export const Orderbook: OrderbookArtifact = contract.default({
    abi: OrderbookJSON,
    address: NetworkData.contracts[0].orderbook,
});

export const RenExSettlement: RenExSettlementArtifact = contract.default({
    abi: RenExSettlementJSON,
    address: NetworkData.contracts[0].renExSettlement,
});

export const RenExBalances: RenExBalancesArtifact = contract.default({
    abi: RenExBalancesJSON,
    address: NetworkData.contracts[0].renExBalances,
});

export const RenExAtomicInfo: RenExAtomicInfoArtifact = contract.default({
    abi: RenExAtomicInfoJSON,
    address: "",
});