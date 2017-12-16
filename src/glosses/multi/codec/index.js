const {
    data: { varint },
    is
} = adone;

const __ = adone.lazify({
    baseTable: "./base_table"
}, adone.asNamespace(exports), require);

const util = {
    bufferToNumber(buf) {
        return parseInt(buf.toString("hex"), 16);
    },
    numberToBuffer(num) {
        let hexString = num.toString(16);
        if (hexString.length % 2 === 1) {
            hexString = `0${hexString}`;
        }
        return Buffer.from(hexString, "hex");
    },
    varintBufferEncode(input) {
        return Buffer.from(varint.encode(util.bufferToNumber(input)));
    },
    varintBufferDecode(input) {
        return util.numberToBuffer(varint.decode(input));
    }
};


// this creates a map for code as hexString -> codecName
const codeToCodecName = {};

for (const encodingName in __.baseTable) {
    const code = __.baseTable[encodingName];
    codeToCodecName[code.toString("hex")] = encodingName;
}


// this creates a map for codecName -> codeVarintBuffer
const codecNameToCodeVarint = {};

for (const encodingName in __.baseTable) {
    const code = __.baseTable[encodingName];
    codecNameToCodeVarint[encodingName] = util.varintBufferEncode(code);
}

export const varintTable = codecNameToCodeVarint;


/**
 * Prefix a buffer with a multicodec-packed.
 *
 * @param {string|number} multicodecStrOrCode
 * @param {Buffer} data
 * @returns {Buffer}
 */
export const addPrefix = (multicodecStrOrCode, data) => {
    let prefix;

    if (is.buffer(multicodecStrOrCode)) {
        prefix = util.varintBufferEncode(multicodecStrOrCode);
    } else {
        if (codecNameToCodeVarint[multicodecStrOrCode]) {
            prefix = codecNameToCodeVarint[multicodecStrOrCode];
        } else {
            throw new Error("multicodec not recognized");
        }
    }
    return Buffer.concat([prefix, data]);
};

/**
 * Decapsulate the multicodec-packed prefix from the data.
 *
 * @param {Buffer} data
 * @returns {Buffer}
 */
export const rmPrefix = (data) => {
    varint.decode(data);
    return data.slice(varint.decode.bytes);
};

/**
 * Get the codec of the prefixed data.
 * @param {Buffer} prefixedData
 * @returns {string}
 */
export const getCodec = (prefixedData) => {
    const code = util.varintBufferDecode(prefixedData);
    const codecName = codeToCodecName[code.toString("hex")];
    return codecName;
};
