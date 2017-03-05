const { DEFAULT_INITIAL_SIZE } = adone.stream.buffer;

const simpleString = "This is a String!";
const unicodeString = "\u00bd + \u00bc = \u00be";
const binaryData = new Buffer(64);
for (let i = 0; i < binaryData.length; i++) {
    binaryData[i] = i;
}

// Binary data larger than initial size of buffers.
const largeBinaryData = new Buffer(DEFAULT_INITIAL_SIZE + 1);
for (let i = 0; i < largeBinaryData.length; i++) {
    largeBinaryData[i] = i % 256;
}

export default {
    simpleString,
    unicodeString,
    binaryData,
    largeBinaryData
};
