const {
    is,
    stream: { pull }
} = adone;

const lpOpts = {
    fixed: true,
    bytes: 4
};

const ensureBuffer = function () {
    return pull.map((c) => {
        if (is.string(c)) {
            return Buffer.from(c, "utf-8");
        }

        return c;
    });
};

exports.createBoxStream = (cipher, mac) => {
    return pull(
        ensureBuffer(),
        pull.asyncMap((chunk, cb) => {
            cipher.encrypt(chunk, (err, data) => {
                if (err) {
                    return cb(err);
                }

                mac.digest(data, (err, digest) => {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, Buffer.concat([data, digest]));
                });
            });
        }),
        pull.lengthPrefixed.encode(lpOpts)
    );
};

exports.createUnboxStream = (decipher, mac) => {
    return pull(
        ensureBuffer(),
        pull.lengthPrefixed.decode(lpOpts),
        pull.asyncMap((chunk, cb) => {
            const l = chunk.length;
            const macSize = mac.length;

            if (l < macSize) {
                return cb(new Error(`buffer (${l}) shorter than MAC size (${macSize})`));
            }

            const mark = l - macSize;
            const data = chunk.slice(0, mark);
            const macd = chunk.slice(mark);

            mac.digest(data, (err, expected) => {
                if (err) {
                    return cb(err);
                }

                if (!macd.equals(expected)) {
                    return cb(new Error(`MAC Invalid: ${macd.toString("hex")} != ${expected.toString("hex")}`));
                }

                // all good, decrypt
                decipher.decrypt(data, (err, decrypted) => {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, decrypted);
                });
            });
        })
    );
};

