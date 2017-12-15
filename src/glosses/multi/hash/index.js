const {
    is,
    data: { base58, varint }
} = adone;

const __ = adone.lazify({
    names: ["./constants", (mod) => mod.names],
    codes: ["./constants", (mod) => mod.codes],
    defaultLengths: ["./constants", (mod) => mod.defaultLengths],
    async: "./async"
}, adone.asNamespace(exports), require);


/**
 * Convert the given multihash to a hex encoded string.
 *
 * @param {Buffer} hash
 * @returns {string}
 */
export const toHexString = (hash) => {
    if (!is.buffer(hash)) {
        throw new Error("must be passed a buffer");
    }

    return hash.toString("hex");
};

/**
 * Convert the given hex encoded string to a multihash.
 *
 * @param {string} hash
 * @returns {Buffer}
 */
export const fromHexString = (hash) => Buffer.from(hash, "hex");

/**
 * Convert the given multihash to a base58 encoded string.
 *
 * @param {Buffer} hash
 * @returns {string}
 */
export const toB58String = (hash) => {
    if (!is.buffer(hash)) {
        throw new Error("must be passed a buffer");
    }

    return base58.encode(hash);
};

/**
 * Convert the given base58 encoded string to a multihash.
 *
 * @param {string|Buffer} hash
 * @returns {Buffer}
 */
export const fromB58String = (hash) => {
    let encoded = hash;
    if (is.buffer(hash)) {
        encoded = hash.toString();
    }

    return Buffer.from(base58.decode(encoded));
};

/**
 * Checks wether a code is part of the app range
 *
 * @param {number} code
 * @returns {boolean}
 */
export const isAppCode = (code) => code > 0 && code < 0x10;


/**
 * Checks whether a multihash code is valid.
 *
 * @param {number} code
 * @returns {boolean}
 */
export const isValidCode = (code) => {
    if (isAppCode(code)) {
        return true;
    }

    if (__.codes[code]) {
        return true;
    }

    return false;
};

/**
 * Decode a hash from the given multihash.
 *
 * @param {Buffer} buf
 * @returns {{code: number, name: string, length: number, digest: Buffer}} result
 */
export const decode = (buf) => {
    if (!(is.buffer(buf))) {
        throw new Error("multihash must be a Buffer");
    }

    if (buf.length < 3) {
        throw new Error("multihash too short. must be > 3 bytes.");
    }

    const code = varint.decode(buf);
    if (!isValidCode(code)) {
        throw new Error(`multihash unknown function code: 0x${code.toString(16)}`);
    }
    buf = buf.slice(varint.decode.bytes);

    const len = varint.decode(buf);
    if (len < 1) {
        throw new Error(`multihash invalid length: 0x${len.toString(16)}`);
    }
    buf = buf.slice(varint.decode.bytes);

    if (buf.length !== len) {
        throw new Error(`multihash length inconsistent: 0x${buf.toString("hex")}`);
    }

    return {
        code,
        name: __.codes[code],
        length: len,
        digest: buf
    };
};

/**
 * Converts a hash function name into the matching code.
 * If passed a number it will return the number if it's a valid code.
 * @param {string|number} name
 * @returns {number}
 */
export const coerceCode = (name) => {
    let code = name;

    if (is.string(name)) {
        if (!__.names[name]) {
            throw new Error(`Unrecognized hash function named: ${name}`);
        }
        code = __.names[name];
    }

    if (!is.number(code)) {
        throw new Error(`Hash function code should be a number. Got: ${code}`);
    }

    if (!__.codes[code] && !isAppCode(code)) {
        throw new Error(`Unrecognized function code: ${code}`);
    }

    return code;
};

/**
 *  Encode a hash digest along with the specified function code.
 *
 * > **Note:** the length is derived from the length of the digest itself.
 *
 * @param {Buffer} digest
 * @param {string|number} code
 * @param {number} [length]
 * @returns {Buffer}
 */
export const encode = (digest, code, length) => {
    if (!digest || !code) {
        throw new Error("multihash encode requires at least two args: digest, code");
    }

    // ensure it's a hashfunction code.
    const hashfn = coerceCode(code);

    if (!(is.buffer(digest))) {
        throw new Error("digest should be a Buffer");
    }

    if (is.nil(length)) {
        length = digest.length;
    }

    if (length && digest.length !== length) {
        throw new Error("digest length should be equal to specified length.");
    }

    return Buffer.concat([
        Buffer.from(varint.encode(hashfn)),
        Buffer.from(varint.encode(length)),
        digest
    ]);
};

/**
 * Check if the given buffer is a valid multihash. Throws an error if it is not valid.
 *
 * @param {Buffer} multihash
 * @returns {undefined}
 * @throws {Error}
 */
export const validate = (multihash) => {
    decode(multihash); // throws if bad.
};

/**
 * Returns a prefix from a valid multihash. Throws an error if it is not valid.
 *
 * @param {Buffer} multihash
 * @returns {undefined}
 * @throws {Error}
 */
export const prefix = (multihash) => {
    validate(multihash);

    return multihash.slice(0, 2);
};
