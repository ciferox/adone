const {
    is
} = adone;

const constants = require("./constants");

const errNotSupported = new Error("Unsupported encoding");

const getBase = function (nameOrCode) {
    let base;

    if (constants.names[nameOrCode]) {
        base = constants.names[nameOrCode];
    } else if (constants.codes[nameOrCode]) {
        base = constants.codes[nameOrCode];
    } else {
        throw errNotSupported;
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
const validEncode = function (name, buf) {
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
const multibase = function (nameOrCode, buf) {
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
const encode = function (nameOrCode, buf) {
    const base = getBase(nameOrCode);
    const name = base.name;

    return multibase(name, Buffer.from(base.encode(buf)));
};

/**
 * Takes a buffer or string encoded with multibase header, decodes it and
 * returns the decoded buffer
 *
 * @param {Buffer|string} bufOrString
 * @returns {Buffer}
 * @memberof Multibase
 *
 */
const decode = function (bufOrString) {
    if (is.buffer(bufOrString)) {
        bufOrString = bufOrString.toString();
    }

    const code = bufOrString.substring(0, 1);
    bufOrString = bufOrString.substring(1, bufOrString.length);

    if (is.string(bufOrString)) {
        bufOrString = Buffer.from(bufOrString);
    }

    const base = getBase(code);
    return Buffer.from(base.decode(bufOrString.toString()));
};

/**
 * Is the given data multibase encoded?
 *
 * @param {Buffer|string} bufOrString
 * @returns {boolean}
 * @memberof Multibase
 */
const isEncoded = function (bufOrString) {
    if (is.buffer(bufOrString)) {
        bufOrString = bufOrString.toString();
    }

    // Ensure bufOrString is a string
    if (Object.prototype.toString.call(bufOrString) !== "[object String]") {
        return false;
    }

    const code = bufOrString.substring(0, 1);
    try {
        const base = getBase(code);
        return base.name;
    } catch (err) {
        return false;
    }
};

exports = module.exports = multibase;
exports.encode = encode;
exports.decode = decode;
exports.isEncoded = isEncoded;
exports.names = Object.freeze(Object.keys(constants.names));
exports.codes = Object.freeze(Object.keys(constants.codes));
