const {
    std: { crypto: { getHashes } }
} = adone;

const nodeHashes = getHashes();

for (const algo of nodeHashes) {
    exports[adone.text.toCamelCase(algo)] = (data, encoding) => adone.std.crypto.createHash(algo).update(data).digest(encoding);
}

adone.lazify({
    sha3: "./sha3",
    murmur3: "./murmur3",
    blake: "./blake",
    meta: "./meta"
}, exports, require);
