const {
    math: { hash }
} = adone;

export default (() => {
    const suites = {};

    const encoding = ["hex", "binary", "base64"];
    const hashes = adone.std.crypto.getHashes();

    for (const n of [32, 100, 1000, 10000]) {
        const buffer = adone.std.crypto.randomBytes(100);
        
        const j = 0;
        const suite = suites[`buffer${n} (encoding: ${encoding[j]})`] = {};
        for (let i = 0, ii = hashes.length; i < ii; ++i) {
            // eslint-disable-next-line
            suite[hashes[i]] = () => {
                return hash(hashes[i], buffer, encoding[j]);
            };
        }
    }
    return suites;
})();
