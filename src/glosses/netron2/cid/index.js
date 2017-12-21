const {
    is,
    multi
} = adone;

/**
 * @typedef {Object} SerializedCID
 * @param {string} codec
 * @param {number} version
 * @param {Buffer} multihash
 *
 */

/**
 * Class representing a CID `<mbase><version><mcodec><mhash>`
 * , as defined in [ipld/cid](https://github.com/ipld/cid).
 * @class CID
 */
export default class CID {
    /**
     * Create a new CID.
     *
     * The algorithm for argument input is roughly:
     * ```
     * if (str)
     *   if (1st char is on multibase table) -> CID String
     *   else -> bs58 encoded multihash
     * else if (Buffer)
     *   if (0 or 1) -> CID
     *   else -> multihash
     * else if (Number)
     *   -> construct CID by parts
     *
     * ..if only JS had traits..
     * ```
     *
     * @param {string|Buffer} version
     * @param {string} [codec]
     * @param {Buffer} [multihash]
     *
     * @example
     *
     * new CID(<version>, <codec>, <multihash>)
     * new CID(<cidStr>)
     * new CID(<cid.buffer>)
     * new CID(<multihash>)
     * new CID(<bs58 encoded multihash>)
     * new CID(<cid>)
     *
     */
    constructor(version, codec, multihash) {
        if (CID.isCID(version)) {
            const cid = version;
            this.version = cid.version;
            this.codec = cid.codec;
            this.multihash = Buffer.from(cid.multihash);
            return;
        }
        if (is.string(version)) {
            if (multi.base.isEncoded(version)) { // CID String (encoded with multibase)
                const cid = multi.base.decode(version);
                version = parseInt(cid.slice(0, 1).toString("hex"), 16);
                codec = multi.codec.getCodec(cid.slice(1));
                multihash = multi.codec.rmPrefix(cid.slice(1));
            } else { // bs58 string encoded multihash
                codec = "dag-pb";
                multihash = multi.hash.fromB58String(version);
                version = 0;
            }
        } else if (is.buffer(version)) {
            const firstByte = version.slice(0, 1);
            const v = parseInt(firstByte.toString("hex"), 16);
            if (v === 0 || v === 1) { // CID
                const cid = version;
                version = v;
                codec = multi.codec.getCodec(cid.slice(1));
                multihash = multi.codec.rmPrefix(cid.slice(1));
            } else { // multihash
                codec = "dag-pb";
                multihash = version;
                version = 0;
            }
        }

        /**
         * @type {string}
         */
        this.codec = codec;

        /**
         * @type {number}
         */
        this.version = version;

        /**
         * @type {Buffer}
         */
        this.multihash = multihash;

        CID.validateCID(this);
    }

    /**
     * The CID as a `Buffer`
     *
     * @return {Buffer}
     * @readonly
     *
     * @memberOf CID
     */
    get buffer() {
        switch (this.version) {
            case 0:
                return this.multihash;
            case 1:
                return Buffer.concat([
                    Buffer.from("01", "hex"),
                    Buffer.from(multi.codec.varintTable[this.codec]),
                    this.multihash
                ]);
            default:
                throw new Error("unsupported version");
        }
    }

    /**
     * Get the prefix of the CID.
     *
     * @returns {Buffer}
     * @readonly
     */
    get prefix() {
        return Buffer.concat([
            Buffer.from(`0${this.version}`, "hex"),
            multi.codec.varintTable[this.codec],
            multi.hash.prefix(this.multihash)
        ]);
    }

    /**
     * Convert to a CID of version `0`.
     *
     * @returns {CID}
     */
    toV0() {
        if (this.codec !== "dag-pb") {
            throw new Error("Cannot convert a non dag-pb CID to CIDv0");
        }

        return new CID(0, this.codec, this.multihash);
    }

    /**
     * Convert to a CID of version `1`.
     *
     * @returns {CID}
     */
    toV1() {
        return new CID(1, this.codec, this.multihash);
    }

    /**
     * Encode the CID into a string.
     *
     * @param {string} [base='base58btc'] - Base encoding to use.
     * @returns {string}
     */
    toBaseEncodedString(base) {
        base = base || "base58btc";

        switch (this.version) {
            case 0: {
                if (base !== "base58btc") {
                    throw new Error("not supported with CIDv0, to support different bases, please migrate the instance do CIDv1, you can do that through cid.toV1()");
                }
                return multi.hash.toB58String(this.multihash);
            }
            case 1:
                return multi.base.encode(base, this.buffer).toString();
            default:
                throw new Error("Unsupported version");
        }
    }

    /**
     * Serialize to a plain object.
     *
     * @returns {SerializedCID}
     */
    toJSON() {
        return {
            codec: this.codec,
            version: this.version,
            hash: this.multihash
        };
    }

    /**
     * Compare equality with another CID.
     *
     * @param {CID} other
     * @returns {bool}
     */
    equals(other) {
        return this.codec === other.codec &&
            this.version === other.version &&
            this.multihash.equals(other.multihash);
    }

    /**
     * Test if the given input is a CID.
     *
     * @param {any} other
     * @returns {bool}
     */
    static isCID(other) {
        try {
            CID.validateCID(other);
        } catch (err) {
            return false;
        }

        return true;
    }

    /**
     * Test if the given input is a valid CID object.
     * Throws if it is not.
     *
     * @param {any} other
     * @returns {void}
     */
    static validateCID(other) {
        if (is.nil(other)) {
            throw new Error("null values are not valid CIDs");
        }

        if (!(other.version === 0 || other.version === 1)) {
            throw new Error("Invalid version, must be a number equal to 1 or 0");
        }

        if (!is.string(other.codec)) {
            throw new Error("codec must be string");
        }

        if (!is.buffer(other.multihash)) {
            throw new Error("multihash must be a Buffer");
        }

        multi.hash.validate(other.multihash);
    }
}

CID.codecs = multi.codec.baseTable;
