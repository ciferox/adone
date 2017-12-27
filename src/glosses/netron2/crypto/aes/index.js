const ciphers = require("./ciphers");

const CIPHER_MODES = {
    16: "aes-128-ctr",
    32: "aes-256-ctr"
};

exports.create = function (key, iv) {
    const mode = CIPHER_MODES[key.length];
    if (!mode) {
        throw new Error("Invalid key length");
    }

    const cipher = ciphers.createCipheriv(mode, key, iv);
    const decipher = ciphers.createDecipheriv(mode, key, iv);

    return {
        encrypt(data) {
            return cipher.update(data);
        },

        decrypt(data) {
            return decipher.update(data);
        }
    };
};
