adone.lazify({
    hmac: "./hmac",
    aes: "./aes",
    keys: "./keys",
    secp256k1: "./secp256k1",
    randomBytes: "./random-bytes",
    pbkdf2: "./pbkdf2"
}, exports, require);

adone.lazifyPrivate({
    util: "./util"
}, exports, require);
