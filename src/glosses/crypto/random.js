const {
    std: { crypto }
} = adone;

export const getBytes = (n) => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(n, (err, buf) => {
            err ? reject(err) : resolve(buf);
        });
    });
};

export const getBytesSync = (n) => {
    return crypto.randomBytes(n);
};
