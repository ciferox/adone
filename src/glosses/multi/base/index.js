const {
    is
} = adone;

const __ = adone.lazify({
    names: ["./constants", (mod) => mod.names],
    codes: ["./constants", (mod) => mod.codes]
}, adone.asNamespace(exports), require);

const getBase = (nameOrCode) => {
    let base;

    if (__.names[nameOrCode]) {
        base = __.names[nameOrCode];
    } else if (__.codes[nameOrCode]) {
        base = __.codes[nameOrCode];
    } else {
        throw new Error("Unsupported encoding");
    }

    if (!base.isImplemented()) {
        throw new Error(`Base ${nameOrCode} is not implemented yet`);
    }

    return base;
};

/**
 * @param {string} name
 * @param {Buffer} buf
 * @private
 * @returns {undefined}
 */
const validEncode = (name, buf) => {
    const base = getBase(name);
    base.decode(buf.toString());
};


/**
 * Create a new buffer with the multibase varint+code.
 *
 * @param {string|number} nameOrCode - The multibase name or code number.
 * @param {Buffer} buf - The data to be prefixed with multibase.
 * @memberof Multibase
 * @returns {Buffer}
 */
export const create = (nameOrCode, buf) => {
    if (!buf) {
        throw new Error("requires an encoded buffer");
    }
    const base = getBase(nameOrCode);
    const codeBuf = Buffer.from(base.code);

    const name = base.name;
    validEncode(name, buf);
    return Buffer.concat([codeBuf, buf]);
};

/**
 * Encode data with the specified base and add the multibase prefix.
 *
 * @param {string|number} nameOrCode - The multibase name or code number.
 * @param {Buffer} buf - The data to be encoded.
 * @returns {Buffer}
 * @memberof Multibase
 */
export const encode = (nameOrCode, buf) => {
    const base = getBase(nameOrCode);
    const name = base.name;

    return create(name, Buffer.from(base.encode(buf)));
};

/**
 *
 * Takes a buffer or string encoded with multibase header
 * decodes it and returns an object with the decoded buffer
 * and the encoded type { base: <name>, data: <buffer> }
 *
 * from @theobat : This is not what the multibase.spec.js test is waiting for,
 * hence the return decodeObject.data
 *
 * @param {Buffer|string} bufOrString
 * @returns {Object} result
 * @returns {string} result.base
 * @returns {Buffer} result.data
 * @memberof Multibase
 *
 */
export const decode = (bufOrString) => {
    if (is.buffer(bufOrString)) {
        bufOrString = bufOrString.toString();
    }

    const code = bufOrString.substring(0, 1);
    bufOrString = bufOrString.substring(1, bufOrString.length);

    if (is.string(bufOrString)) {
        bufOrString = Buffer.from(bufOrString);
    }

    const base = getBase(code);

    const decodeObject = {
        base: base.name,
        data: Buffer.from(base.decode(bufOrString.toString()))
    };
    return decodeObject.data;
};

/**
 * Is the given data multibase encoded?
 *
 * @param {Buffer|string} bufOrString
 * @returns {boolean}
 * @memberof Multibase
 */
export const isEncoded = (bufOrString) => {
    if (is.buffer(bufOrString)) {
        bufOrString = bufOrString.toString();
    }

    const code = bufOrString.substring(0, 1);
    try {
        const base = getBase(code);
        return base.name;
    } catch (err) {
        return false;
    }
};
