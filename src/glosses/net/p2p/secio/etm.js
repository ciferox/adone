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

export const createBoxStream = (cipher, mac) => {
    return pull(
        ensureBuffer(),
        pull.asyncMap((chunk, cb) => {
            try {
                const data = cipher.encrypt(chunk);
                const digest = mac.digest(data);
                cb(null, Buffer.concat([data, digest]));
            } catch (err) {
                cb(err);
            }
        }),
        pull.lengthPrefixed.encode(lpOpts)
    );
};

export const createUnboxStream = (decipher, mac) => {
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

            try {
                const expected = mac.digest(data);

                if (!macd.equals(expected)) {
                    throw new Error(`MAC Invalid: ${macd.toString("hex")} != ${expected.toString("hex")}`);
                }

                // all good, decrypt
                const decrypted = decipher.decrypt(data);

                cb(null, decrypted);
            } catch (err) {
                cb(err);
            }
        })
    );
};
