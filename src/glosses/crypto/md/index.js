const md = adone.lazify({
    md5: "./md5",
    sha1: "./sha1",
    sha256: "./sha256",
    sha512: "./sha512",
    sha224: () => md.sha512.sha224,
    sha384: () => md.sha512.sha384,
    "sha512/256": () => md.sha512.sha256,
    "sha512/224": () => md.sha512.sha224
}, exports, require);
