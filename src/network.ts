export interface NetworkData {
    network: string;
    ingress: string;
    infura: string;
    etherscan: string;
    ethNetwork: string;
    ethNetworkLabel: string;
    ledgerNetworkId: number;
    contracts: [
        {
            darknodeRegistry: string;
            orderbook: string;
            renExTokens: string;
            renExBalances: string;
            renExSettlement: string;
            renExAtomicInfo: string;
        }
    ];
    tokens: {
        DGX: string;
        REN: string;
        ABC: string;
        XYZ: string;
    };
}

export const NetworkData: NetworkData = {
    "network": "nightly",
    "ingress": "https://renex-ingress-nightly.herokuapp.com",
    "infura": "https://kovan.infura.io",
    "etherscan": "https://kovan.etherscan.io",
    "ethNetwork": "kovan",
    "ethNetworkLabel": "kovan",
    "ledgerNetworkId": 42,
    "contracts": [
        {
            "darknodeRegistry": "0x8a31d477267A5af1bc5142904ef0AfA31D326E03",
            "orderbook": "0x376127aDc18260fc238eBFB6626b2F4B59eC9b66",
            "renExTokens": "0x160ECA47935be4139eC5B94D99B678d6f7e18f95",
            "renExBalances": "0xa95dE870dDFB6188519D5CC63CEd5E0FBac1aa8E",
            "renExSettlement": "0x5f25233ca99104D31612D4fB937B090d5A2EbB75",
            "renExAtomicInfo": "0xe1A660657A32053fe83B19B1177F6B56C6F37b1f"
        }
    ],
    "tokens": {
        "ABC": "0x49fa7a3B9705Fa8DEb135B7bA64C2Ab00Ab915a1",
        "DGX": "0x092eCE29781777604aFAc04887Af30042c3bC5dF",
        "REN": "0x15f692D6B9Ba8CEC643C7d16909e8acdEc431bF6",
        "XYZ": "0x6662449d05312Afe0Ca147Db6Eb155641077883F"
    }
};