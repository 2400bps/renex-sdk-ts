import * as bs58 from "bs58";

import { Record } from "@Lib/record";

export enum Encodings {
    AUTO = "auto",
    HEX = "hex",
    BASE64 = "base64",
    BUFFER = "buffer",
    UNKNOWN = "unknown"
}

const DefaultEncodedData = {
    value: "" as string | Buffer,
    encoding: Encodings.AUTO,
};

const parse = (param: string | Buffer | typeof DefaultEncodedData, encoding?: Encodings) => {
    if (encoding !== undefined) {
        if (typeof (param) === "string" && encoding !== Encodings.BUFFER) {
            param = {
                value: param,
                encoding,
            };
        } else if (param instanceof Buffer && encoding === Encodings.BUFFER) {
            param = {
                value: param as any as Buffer,
                encoding,
            };
        }
    }

    if (typeof param === "string") {
        param = {
            value: param,
            encoding: Encodings.AUTO,
        };
    }
    if (param instanceof Buffer) {
        param = {
            value: param,
            encoding: Encodings.BUFFER,
        };
    }
    if (param.encoding === Encodings.AUTO) {
        if (typeof param.value === "string") {
            if (param.value === "" || param.value.slice(0, 2) === "0x" || param.value.match("^[A-Fa-f0-9]+$")) {
                param.encoding = Encodings.HEX;
            } else if (param.value.match("^[A-Za-z0-9+/=]+$")) {
                param.encoding = Encodings.BASE64;
            }
        } else if (param.value instanceof Buffer) {
            param.encoding = Encodings.BUFFER;
        }
    }

    if (param.encoding === Encodings.BUFFER && !(param.value instanceof Buffer)) {
        throw new Error("invalid buffer");
    }

    if (param.encoding === Encodings.HEX) {
        if (typeof param.value !== "string") {
            throw new Error("invalid hex");
        }

        if (param.value.slice(0, 2) === "0x") {
            param.value = param.value.slice(2);
        }
        if (param.value === "") {
            param.value = "00";
        }

        if (param.value.length % 2 === 1) {
            param.value = "0" + param.value;
        }

        if (!param.value.match("^[A-Fa-f0-9]+$")) {
            throw new Error("invalid hex");
        }
    }

    return param;
};

export class EncodedData extends Record(DefaultEncodedData) {
    constructor(param: EncodedData | string | Buffer | typeof DefaultEncodedData, encoding?: Encodings) {
        if (param instanceof EncodedData) {
            param = { value: param.value, encoding: param.encoding };
        }
        param = parse(param, encoding);
        super(param);
    }

    public toHex(this: EncodedData, prefix = "0x"): string {
        switch (this.encoding) {
            case Encodings.HEX:
                return prefix + this.value;
            case Encodings.BASE64:
                return prefix + Buffer.from(this.value as string, "base64").toString("hex");
            case Encodings.BUFFER:
                return prefix + (this.value as Buffer).toString("hex");
            default:
                throw new Error("Unable to convert to hexadecimal representation");
        }
    }

    public toBase64(this: EncodedData): string {
        switch (this.encoding) {
            case Encodings.HEX:
                return Buffer.from(this.value as string, "hex").toString("base64");
            case Encodings.BASE64:
                return this.value as string;
            case Encodings.BUFFER:
                return (this.value as Buffer).toString("base64");
            default:
                throw new Error("Unable to convert to base64 representation");
        }
    }

    public toBase58(this: EncodedData): string {
        const buff = this.toBuffer();
        return bs58.encode(buff);
    }

    public toBuffer(this: EncodedData): Buffer {
        switch (this.encoding) {
            case Encodings.HEX:
                return Buffer.from(this.value as string, "hex");
            case Encodings.BASE64:
                return Buffer.from(this.value as string, "base64");
            case Encodings.BUFFER:
                return this.value as Buffer;
            default:
                throw new Error("Unable to convert to buffer");
        }
    }

    public toString(this: EncodedData): string {
        return this.toHex();
    }
}
