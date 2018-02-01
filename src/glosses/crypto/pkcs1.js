/**
 * Partial implementation of PKCS#1 v2.2: RSA-OEAP
 */

const {
    is,
    exception,
    crypto,
    util,
    std
} = adone;

const rsaMgf1 = (seed, maskLength, md, mdMeta) => {
    const count = Math.ceil(maskLength / mdMeta.digestLength);
    const bufs = [];
    for (let i = 0; i < count; ++i) {
        const counter = Buffer.allocUnsafe(4);
        counter.writeUInt32BE(i);
        const h = std.crypto.createHash(md);
        h.update(seed);
        h.update(counter);
        bufs.push(h.digest());
    }
    return Buffer.concat(bufs, maskLength);
};

/**
 * Encode the given RSAES-OAEP message (M) using key, with optional label (L)
 * and seed.
 *
 * This method does not perform RSA encryption, it only encodes the message
 * using RSAES-OAEP.
 *
 * @param key the RSA key to use.
 * @param {Buffer | string} message the message to encode.
 * @param options the options to use:
 *          label an optional label to use.
 *          seed the seed to use.
 *          md the message digest object to use, undefined for SHA-1.
 *          mgf1 optional mgf1 parameters:
 *            md the message digest object to use for MGF1.
 *
 * @return the encoded message bytes.
 */
export const encodeRSAOAEP = function (key, message, options) {
    // parse arguments
    let label;
    let seed;
    let md;
    let mgf1Md;
    // legacy args (label, seed, md)
    if (is.string(options)) {
        label = options;
        seed = arguments[3] || undefined;
        md = arguments[4] || "sha1";
    } else if (options) {
        label = options.label || undefined;
        seed = options.seed || undefined;
        md = options.md || "sha1";
        if (options.mgf1 && options.mgf1.md) {
            mgf1Md = options.mgf1.md;
        }
    }

    md = md || "sha1";

    const mdMeta = crypto.hash.meta(md);

    if (is.null(mdMeta)) {
        throw new exception.NotSupported(`"${md}" hash algorithm is not supported for message`);
    }

    const digestLength = mdMeta.digestLength;

    // default OAEP to SHA-1 message digest
    let mgf1Meta;
    if (!mgf1Md) {
        mgf1Md = md;
        mgf1Meta = mdMeta;
    } else {
        mgf1Meta = crypto.hash.meta(mgf1Md);
        if (is.null(mgf1Meta)) {
            throw new exception.NotSupported(`"${mgf1Md}" hash algorithm is not supported for mgf1`);
        }
    }

    // compute length in bytes and check output
    const keyLength = Math.ceil(key.n.bitLength() / 8);
    const maxLength = keyLength - 2 * digestLength - 2;
    if (message.length > maxLength) {
        const error = new Error("RSAES-OAEP input message length is too long.");
        error.length = message.length;
        error.maxLength = maxLength;
        throw error;
    }

    label = label || "";

    if (!is.buffer(label)) {
        label = Buffer.from(label);
    }

    const lHash = crypto.hash[md](label);

    if (!is.buffer(message)) {
        message = Buffer.from(message);
    }

    const PS = Buffer.alloc(maxLength - message.length);

    const DB = Buffer.concat([
        lHash,
        PS,
        Buffer.from([0x01]),
        message
    ]);

    if (!seed) {
        seed = crypto.random.getBytesSync(digestLength);
    } else {
        if (seed.length !== digestLength) {
            const error = new Error("Invalid RSAES-OAEP seed. The seed length must match the digest length.");
            error.seedLength = seed.length;
            error.digestLength = digestLength;
            throw error;
        }
        if (!is.buffer(seed)) {
            seed = Buffer.from(seed);
        }
    }

    const dbMask = rsaMgf1(seed, keyLength - digestLength - 1, mgf1Md, mgf1Meta);
    const maskedDB = util.buffer.xor(DB, dbMask, DB.length);

    const seedMask = rsaMgf1(maskedDB, digestLength, mgf1Md, mgf1Meta);
    const maskedSeed = util.buffer.xor(seed, seedMask, seed.length);

    // return encoded message
    return Buffer.concat([
        Buffer.from([0x00]),
        maskedSeed,
        maskedDB
    ]);
};

/**
 * Decode the given RSAES-OAEP encoded message (EM) using key, with optional
 * label (L).
 *
 * This method does not perform RSA decryption, it only decodes the message
 * using RSAES-OAEP.
 *
 * @param key the RSA key to use.
 * @param em the encoded message to decode.
 * @param options the options to use:
 *          label an optional label to use.
 *          md the message digest object to use for OAEP, undefined for SHA-1.
 *          mgf1 optional mgf1 parameters:
 *            md the message digest object to use for MGF1.
 *
 * @return the decoded message bytes.
 */
export const decodeRSAOAEP = function (key, em, options) {
    // parse args
    let label;
    let md;
    let mgf1Md;
    // legacy args
    if (is.string(options)) {
        label = options;
        md = arguments[3] || "sha1";
    } else if (options) {
        label = options.label || undefined;
        md = options.md || "sha1";
        if (options.mgf1 && options.mgf1.md) {
            mgf1Md = options.mgf1.md;
        }
    }

    md = md || "sha1";

    const mdMeta = crypto.hash.meta(md);

    if (is.null(mdMeta)) {
        throw new exception.NotSupported(`"${md}" hash algorithm is not supported for message`);
    }

    const digestLength = mdMeta.digestLength;

    // compute length in bytes
    const keyLength = Math.ceil(key.n.bitLength() / 8);

    if (em.length !== keyLength) {
        const error = new Error("RSAES-OAEP encoded message length is invalid.");
        error.length = em.length;
        error.expectedLength = keyLength;
        throw error;
    }

    // default OAEP to SHA-1 message digest
    let mgf1Meta;

    if (!mgf1Md) {
        mgf1Md = md;
        mgf1Meta = mdMeta;
    } else {
        mgf1Meta = crypto.hash.meta(mgf1Md);
        if (is.null(mgf1Meta)) {
            throw new exception.NotSupported(`"${mgf1Md}" hash algorithm is not supported for mgf1`);
        }
    }

    if (keyLength < 2 * digestLength + 2) {
        throw new Error("RSAES-OAEP key is too short for the hash function.");
    }

    label = label || "";

    if (!is.buffer(label)) {
        label = Buffer.from(label);
    }
    const lHash = crypto.hash[md](label);

    if (!is.buffer(em)) {
        em = Buffer.from(em);
    }

    // split the message into its parts
    const y = em[0];
    const maskedSeed = em.slice(1, digestLength + 1);
    const maskedDB = em.slice(1 + digestLength);

    const seedMask = rsaMgf1(maskedDB, digestLength, mgf1Md, mgf1Meta);
    const seed = util.buffer.xor(maskedSeed, seedMask, maskedSeed.length);

    const dbMask = rsaMgf1(seed, keyLength - digestLength - 1, mgf1Md, mgf1Meta);
    const db = util.buffer.xor(maskedDB, dbMask, maskedDB.length);

    const lHashPrime = db.slice(0, digestLength);

    // constant time check that all values match what is expected
    let error = y !== 0;

    // constant time check lHash vs lHashPrime
    for (let i = 0; i < digestLength; ++i) {
        error |= lHash[i] !== lHashPrime[i];
    }

    // "constant time" find the 0x1 byte separating the padding (zeros) from the
    // message
    // TODO: It must be possible to do this in a better/smarter way?
    let inPS = 1;
    let index = digestLength;
    for (let j = digestLength; j < db.length; j++) {
        const code = db[j];

        const is0 = (code & 0x1) ^ 0x1;

        // non-zero if not 0 or 1 in the ps section
        const errorMask = inPS ? 0xfffe : 0x0000;
        error |= (code & errorMask);

        // latch in_ps to zero after we find 0x1
        inPS = inPS & is0;
        index += inPS;
    }
    if (error || db[index] !== 0x01) {
        throw new Error("Invalid RSAES-OAEP padding.");
    }

    return db.slice(index + 1);
};
