const lengths = {
    SHA1: 20,
    SHA256: 32,
    SHA512: 64
};

exports.create = function (hash, secret) {
    return {
        digest(data) {
            const hmac = adone.std.crypto.createHmac(hash.toLowerCase(), secret);
            hmac.update(data);
            return hmac.digest();
        },
        length: lengths[hash]
    };
};
