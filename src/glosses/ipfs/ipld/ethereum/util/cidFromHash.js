const {
    multiformat: { CID, multihash: multihashes }
} = adone;

module.exports = cidFromHash

function cidFromHash(codec, rawhash, options) {
    options = options || {}
    const hashAlg = options.hashAlg || 'keccak-256'
    const version = typeof options.version === 'undefined' ? 1 : options.version
    const multihash = multihashes.encode(rawhash, hashAlg)
    return new CID(version, codec, multihash)
}
