const lengths = {
    SHA1: 20,
    SHA256: 32,
    SHA512: 64
};

exports.create = function (hash, secret, callback) {
    const res = {
        digest(data, cb) {
            const hmac = adone.std.crypto.createHmac(hash.toLowerCase(), secret);

            hmac.update(data);

            setImmediate(() => {
                cb(null, hmac.digest());
            });
        },
        length: lengths[hash]
    };

    callback(null, res);
};
