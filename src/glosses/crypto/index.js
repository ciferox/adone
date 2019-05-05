const {
    lazify
} = adone;

// default options
export const options = {
    usePureJavaScript: false
};

lazify({
    // forge
    aes: "./aes",
    asn1: "./asn1",
    cipher: "./cipher",
    debug: "./debug",
    des: "./des",
    ed25519: "./ed25519",
    hmac: "./hmac",
    jsbn: "./jsbn",
    kem: "./kem",
    log: "./log",
    md5: "./md5",
    mgf: () => lazify({
        mgf1: "./mgf1"
    }, null, require),
    mgf1: "./mgf1",
    oids: "./oids",
    pbe: "./pbe",
    pbkdf2: "./pbkdf2",
    pem: "./pem",
    pkcs1: "./pkcs1",
    pkcs12: "./pkcs12",
    pkcs5: () => lazify({
        pbkdf2: "./pbkdf2"
    }, null, require),
    pkcs7: "./pkcs7",
    pkcs7asn1: "./pkcs7asn1",
    pki: "./pki",
    prime: "./prime",
    prng: "./prng",
    pss: "./pss",
    random: "./random",
    rc2: "./rc2",
    rsa: "./rsa",
    sha1: "./sha1",
    sha256: "./sha256",
    sha384: () => adone.crypto.sha512.sha384,
    sha512: "./sha512",
    ssh: "./ssh",
    task: "./task",
    tls: "./tls",
    util: "./util",

    // extra
    crc: "./crc"
}, adone.asNamespace(exports), require);


export const md = {
    algorithms: {}
};

lazify({
    md5: "./md5",
    sha1: "./sha1",
    sha256: "./sha256",
    sha384: () => adone.crypto.sha512.sha384,
    sha512: "./sha512",
    "sha512/224": () => adone.crypto.sha512.sha224,
    "sha512/256": () => adone.crypto.sha512.sha256
}, md, require);

lazify({
    md5: "./md5",
    sha1: "./sha1",
    sha256: "./sha256",
    sha384: () => adone.crypto.sha512.sha384,
    sha512: "./sha512",
    "sha512/224": () => adone.crypto.sha512.sha224,
    "sha512/256": () => adone.crypto.sha512.sha256
}, md.algorithms, require);
