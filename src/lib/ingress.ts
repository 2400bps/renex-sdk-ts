import axios from "axios";

// tsc complains about importing NodeRSA normally
import * as NodeRSAType from "node-rsa";
const NodeRSA = require("node-rsa") as { new(...args: any[]): NodeRSAType };

import Web3 from "web3";

import { BN } from "bn.js";
import { List, Map } from "immutable";

import * as shamir from "@Lib/shamir";

import { EncodedData, Encodings } from "@Lib/encodedData";
import { OrderSettlement } from "@Lib/market";
import { NetworkData } from "@Lib/network";
import { Record } from "@Lib/record";
import { DarknodeRegistryContract } from "@Bindings/darknode_registry";

export const ErrorCanceledByUser = "Canceled by user";
export const ErrorNoAccount = "Cannot retrieve wallet account";
export const ErrorNoWeb3 = "Cannot retrieve web3 object";
export const ErrorUnsignedTransaction = "Unable to sign transaction";
export const ErrorInvalidOrderDetails = "Something went wrong while encoding order";

const NULL = "0x0000000000000000000000000000000000000000";

export enum OrderType {
    MIDPOINT = 0,
    LIMIT = 1, // FIXME: unsupported
}

export enum OrderParity {
    BUY = 0,
    SELL = 1,
}

export class Tuple extends Record({
    c: 0,
    q: 0,
}) { }

export class Order extends Record({
    signature: "",
    id: "",
    type: OrderType.LIMIT,
    parity: OrderParity.BUY,
    orderSettlement: OrderSettlement.RenEx,
    expiry: Math.round((new Date()).getTime() / 1000),
    tokens: 0x00010008,
    price: new Tuple(),
    volume: new Tuple(),
    minimumVolume: new Tuple(),
    nonce: new BN(0),
}) { }

export class OrderFragments extends Record({
    signature: "",
    orderFragmentMappings: Array<Map<string, List<OrderFragment>>>()
}) { }

export class OrderFragment extends Record({
    id: "",
    orderSignature: "",
    orderId: "",
    orderType: OrderType.LIMIT,
    orderParity: OrderParity.BUY,
    orderSettlement: OrderSettlement.RenEx,
    orderExpiry: Math.round((new Date()).getTime() / 1000),
    tokens: "",
    price: ["", ""],
    volume: ["", ""],
    minimumVolume: ["", ""],
    nonce: "",
    index: 0,
}) { }

export class Pool extends Record({
    id: "",
    darknodes: List<string>(),
    orderFragments: List<OrderFragment>(),
}) { }

export function randomNonce(randomBN: () => BN): BN {
    let nonce = randomBN();
    while (nonce.gte(shamir.PRIME)) {
        nonce = randomBN();
    }
    return nonce;
}

export async function openOrder(web3: Web3, address: string, order: Order): Promise<Order> {
    // Verify order details
    if (!verifyOrder(order)) {
        return Promise.reject(new Error(ErrorInvalidOrderDetails));
    }

    const id: EncodedData = new EncodedData(getOrderID(web3, order), Encodings.HEX);
    const prefix: string = web3.utils.toHex("Republic Protocol: open: ");
    const hashForSigning: string = (prefix + id.toHex(""));

    let signature: EncodedData;
    try {
        signature = new EncodedData(await web3.eth.sign(hashForSigning, address));
    } catch (error) {
        if (error.message.match(/User denied message signature/)) {
            return Promise.reject(new Error(ErrorCanceledByUser));
        }
        return Promise.reject(new Error(ErrorUnsignedTransaction));
    }

    const buff = signature.toBuffer();
    // Normalize v to be 0 or 1 (NOTE: Orderbook contract expects either format,
    // but for future compatibility, we stick to one format)
    // MetaMask gives v as 27 or 28, Ledger gives v as 0 or 1
    if (buff[64] === 27 || buff[64] === 28) {
        buff[64] = buff[64] - 27;
    }

    order = order.merge({ id: id.toBase64(), signature: buff.toString("base64") });

    return order;
}

function verifyOrder(order: Order) {
    const VALID_PRICE =
        order.price.c >= 0 && order.price.c <= 1999 &&
        order.price.q >= 0 && order.price.q <= 52;

    const VALID_VOLUME =
        order.volume.c >= 0 && order.volume.c <= 49 &&
        order.volume.q >= 0 && order.volume.q <= 52;

    const VALID_MINIMUM_VOLUME =
        order.minimumVolume.c >= 0 && order.minimumVolume.c <= 49 &&
        order.minimumVolume.q >= 0 && order.minimumVolume.q <= 52;

    return VALID_PRICE && VALID_VOLUME && VALID_MINIMUM_VOLUME;
}

export async function submitOrderFragments(
    orderFragments: OrderFragments,
): Promise<void> {
    try {
        await axios.post(`${NetworkData.ingress}/orders`, orderFragments.toJS());
    } catch (error) {
        return Promise.reject(error);
    }
}

export async function cancelOrder(web3: Web3, address: string, orderId64: string): Promise<{}> {
    // Hexadecimal encoding of orderId64 (without 0x prefix)
    const orderIdHex: string = new Buffer(orderId64, "base64").toString("hex");
    const prefix: string = web3.utils.toHex("Republic Protocol: cancel: ");
    const hashForSigning: string = prefix + orderIdHex;

    let signature: EncodedData;
    try {
        signature = new EncodedData(await web3.eth.sign(hashForSigning, address), Encodings.HEX);
    } catch (error) {
        if (error.message.match(/User denied message signature/)) {
            return Promise.reject(new Error(ErrorCanceledByUser));
        }
        return Promise.reject(error);
    }

    try {
        await axios.delete(`${NetworkData.ingress}/orders?id=${encodeURIComponent(orderId64)}&signature=${encodeURIComponent(signature.toBase64())}`);
    } catch (error) {
        return Promise.reject(new Error(error));
    }

    return {};
}

// export async function getOrder(wallet: Wallet, orderId: string): Promise<Order> {
//     // FIXME: Unimplemented
//     return Promise.resolve(new Order({}));
// }

// export async function getOrders(wallet: Wallet, order: Order): Promise<List<Order>> {
//     // FIXME: Unimplemented
//     return Promise.resolve(List<Order>());
// }

export function getOrderID(web3: Web3, order: Order): string {
    const bytes = Buffer.concat([
        new BN(order.type).toArrayLike(Buffer, "be", 1),
        new BN(order.parity).toArrayLike(Buffer, "be", 1),
        new BN(order.orderSettlement).toArrayLike(Buffer, "be", 4),
        new BN(order.expiry).toArrayLike(Buffer, "be", 8),
        new BN(order.tokens).toArrayLike(Buffer, "be", 8),
        new BN(order.price.c).toArrayLike(Buffer, "be", 8),
        new BN(order.price.q).toArrayLike(Buffer, "be", 8),
        new BN(order.volume.c).toArrayLike(Buffer, "be", 8),
        new BN(order.volume.q).toArrayLike(Buffer, "be", 8),
        new BN(order.minimumVolume.c).toArrayLike(Buffer, "be", 8),
        new BN(order.minimumVolume.q).toArrayLike(Buffer, "be", 8),
        new Buffer(web3.utils.keccak256(`0x${order.nonce.toArrayLike(Buffer, "be", 8).toString("hex")}`).slice(2), "hex"),
    ]);
    return web3.utils.keccak256(`0x${bytes.toString("hex")}`);
}

export async function buildOrderFragmentsForPods(
    web3: Web3, darknodeRegistryContract: DarknodeRegistryContract, order: Order
): Promise<Map<string, List<OrderFragment>>> {
    const pods = await getPods(web3, darknodeRegistryContract);
    const fragmentPromises = (pods).map(async (pool: Pool): Promise<Pool> => {
        const n = pool.darknodes.size;
        const k = Math.floor((2 * (n + 1)) / 3);

        const tokenShares = shamir.split(n, k, new BN(order.tokens));
        const priceCoShares = shamir.split(n, k, new BN(order.price.c));
        const priceExpShares = shamir.split(n, k, new BN(order.price.q));
        const volumeCoShares = shamir.split(n, k, new BN(order.volume.c));
        const volumeExpShares = shamir.split(n, k, new BN(order.volume.q));
        const minimumVolumeCoShares = shamir.split(n, k, new BN(order.minimumVolume.c));
        const minimumVolumeExpShares = shamir.split(n, k, new BN(order.minimumVolume.q));
        const nonceShares = shamir.split(n, k, order.nonce);

        let orderFragments = List<OrderFragment>();

        // Loop through each darknode in the pool
        for (let i = 0; i < n; i++) {
            const darknode = pool.darknodes.get(i);
            console.log(`Encrypting for darknode ${new EncodedData("0x1b14" + darknode.slice(2), Encodings.HEX).toBase58()}...`);

            // Retrieve darknode RSA public key from Darknode contract
            const darknodeKey = await getDarknodePublicKey(darknodeRegistryContract, darknode);

            let orderFragment = new OrderFragment({
                orderSignature: order.signature,
                orderId: order.id,
                orderType: order.type,
                orderParity: order.parity,
                orderSettlement: order.orderSettlement,
                orderExpiry: order.expiry,
                tokens: encryptForDarknode(darknodeKey, tokenShares.get(i), 8).toBase64(),
                price: [
                    encryptForDarknode(darknodeKey, priceCoShares.get(i), 8).toBase64(),
                    encryptForDarknode(darknodeKey, priceExpShares.get(i), 8).toBase64()
                ],
                volume: [
                    encryptForDarknode(darknodeKey, volumeCoShares.get(i), 8).toBase64(),
                    encryptForDarknode(darknodeKey, volumeExpShares.get(i), 8).toBase64()
                ],
                minimumVolume: [
                    encryptForDarknode(darknodeKey, minimumVolumeCoShares.get(i), 8).toBase64(),
                    encryptForDarknode(darknodeKey, minimumVolumeExpShares.get(i), 8).toBase64()
                ],
                nonce: encryptForDarknode(darknodeKey, nonceShares.get(i), 8).toBase64(),
                index: i + 1,
            });
            orderFragment = orderFragment.set("id", hashOrderFragmentToId(web3, orderFragment));
            orderFragments = orderFragments.push(orderFragment);
        }
        return pool.set("orderFragments", orderFragments);
    });

    // Reduce must happen serially
    return await fragmentPromises.reduce(
        async (poolsPromise: Promise<Map<string, List<OrderFragment>>>, poolPromise: Promise<Pool>) => {
            const pools = await poolsPromise;
            const pool = await poolPromise;
            return pools.set(pool.id, pool.orderFragments);
        },
        Promise.resolve(Map<string, List<OrderFragment>>())
    );
}

function hashOrderFragmentToId(web3: Web3, orderFragment: OrderFragment): string {
    // TODO: Fix order hashing
    return Buffer.from(web3.utils.keccak256(JSON.stringify(orderFragment)).slice(2), "hex").toString("base64");
}

async function getDarknodePublicKey(
    darknodeRegistryContract: DarknodeRegistryContract, darknode: string
): Promise<NodeRSAType | null> {
    const darknodeKeyHex = await darknodeRegistryContract.getDarknodePublicKey(darknode);

    if (darknodeKeyHex === null || darknodeKeyHex.length === 0) {
        console.error(`Unable to retrieve public key for ${darknode}`);
        return null;
    }

    const darknodeKey = new Buffer(darknodeKeyHex.slice(2), "hex");

    // We require the exponent E to fit into 32 bytes.
    // Since it is stored at 64 bytes, we ignore the first 32 bytes.
    // (Go's crypto/rsa Validate() also requires E to fit into a 32-bit integer)
    const e = darknodeKey.slice(0, 8).readUInt32BE(4);
    const n = darknodeKey.slice(8);

    const key = new NodeRSA();
    key.importKey({
        n,
        e,
    });

    key.setOptions({
        encryptionScheme: {
            scheme: "pkcs1_oaep",
            hash: "sha1"
        }
    });

    return key;
}

export function encryptForDarknode(darknodeKey: NodeRSAType | null, share: shamir.Share, byteCount: number): EncodedData {
    if (darknodeKey === null) {
        return new EncodedData("", Encodings.BASE64);
    }

    // TODO: Check that bignumber isn't bigger than 8 bytes (64 bits)
    // Serialize number to 8-byte array (64-bits) (big-endian)
    const indexBytes = new BN(share.index).toArrayLike(Buffer, "be", byteCount);
    const bignumberBytes = share.value.toArrayLike(Buffer, "be", byteCount);

    const bytes = Buffer.concat([indexBytes, bignumberBytes]);

    return new EncodedData(darknodeKey.encrypt(bytes, "buffer"), Encodings.BUFFER);
}

/*
 * Calculate pod arrangement based on current epoch
 */
async function getPods(web3: Web3, darknodeRegistryContract: DarknodeRegistryContract): Promise<List<Pool>> {
    const darknodes = await darknodeRegistryContract.getDarknodes(NULL, 100);
    const minimumPodSize = new BN(await darknodeRegistryContract.minimumPodSize()).toNumber()
    const epoch = await darknodeRegistryContract.currentEpoch();

    if (!darknodes.length) {
        return Promise.reject(new Error("no darknodes in contract"));
    }

    if (minimumPodSize === 0) {
        return Promise.reject(new Error("invalid minimum pod size (0)"));
    }

    const epochVal = new BN(epoch[0]);
    const numberOfDarknodes = new BN(darknodes.length);
    let x = epochVal.mod(numberOfDarknodes);
    let positionInOcean = List();
    for (let i = 0; i < darknodes.length; i++) {
        positionInOcean = positionInOcean.set(i, -1);
    }

    let pools = List<Pool>();
    // FIXME: (setting to 1 if 0)
    const numberOfPods = Math.floor(darknodes.length / minimumPodSize) || 1;
    for (let i = 0; i < numberOfPods; i++) {
        pools = pools.push(new Pool());
    }

    for (let i = 0; i < darknodes.length; i++) {
        let isRegistered = await darknodeRegistryContract.isRegistered(darknodes[x.toNumber()]);
        while (!isRegistered || positionInOcean.get(x.toNumber()) !== -1) {
            x = x.add(new BN(1));
            x = x.mod(numberOfDarknodes);
            isRegistered = await darknodeRegistryContract.isRegistered(darknodes[x.toNumber()]);
        }

        positionInOcean = positionInOcean.set(x.toNumber(), i);
        const poolIndex = i % numberOfPods;

        const pool = new Pool({
            darknodes: pools.get(poolIndex).darknodes.push(darknodes[x.toNumber()])
        });
        pools = pools.set(poolIndex, pool);

        x = x.add(epochVal);
        x = x.mod(numberOfDarknodes);
    }

    for (let i = 0; i < pools.size; i++) {
        let hashData = List<Buffer>();
        for (const darknode of pools.get(i).darknodes.toArray()) {
            hashData = hashData.push(new Buffer(darknode.substring(2), "hex"));
        }

        const id = new EncodedData(web3.utils.keccak256(`0x${Buffer.concat(hashData.toArray()).toString("hex")}`), Encodings.HEX);
        const pool = new Pool({
            id: id.toBase64(),
            darknodes: pools.get(i).darknodes
        });

        console.log(pool.id, JSON.stringify(pool.darknodes.map((node: string) =>
            new EncodedData("0x1B20" + node.slice(2), Encodings.HEX).toBase58()
        ).toArray()));

        pools = pools.set(i, pool);
    }

    return pools;
}