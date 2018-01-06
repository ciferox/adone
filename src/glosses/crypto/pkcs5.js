const {
    is,
    std: { crypto }
} = adone;

export const pbkdf2 = (p, s, c, dkLen, md) => {
    if (!is.string(md)) {
        // default prf to SHA-1
        md = "sha1";
    }

    return new Promise((resolve, reject) => {
        crypto.pbkdf2(p, s, c, dkLen, md, (err, key) => {
            err ? reject(err) : resolve(key);
        });
    });
};

export const pbkdf2Sync = (p, s, c, dkLen, md) => {
    if (!is.string(md)) {
        // default prf to SHA-1
        md = "sha1";
    }

    return crypto.pbkdf2Sync(p, s, c, dkLen, md);
};

