

const crypto = require("crypto");
const MAX_BYTES = 65536;

// One day this will be merged: https://github.com/crypto-browserify/randombytes/pull/16
export const randomBytes = (num) => {
    num = parseInt(num);
    const bytes = Buffer.allocUnsafe(num);

    for (let offset = 0; offset < num; offset += MAX_BYTES) {
        let size = MAX_BYTES;

        if ((offset + size) > num) {
            size = num - offset;
        }

        crypto.randomFillSync(bytes, offset, size);
    }

    return bytes;
};

export const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "ipfs", "unixfs_exporter", ...args);