adone.lazify({
    v1: "./v1",
    v3: "./v3",
    v4: "./v4",
    v5: "./v5"
}, adone.asNamespace(exports), require);

adone.lazifyp({
    util: "./__/util",
    v35: "./__/v35",
    md5: "./__/md5",
    sha1: "./__/sha1"
}, exports, require);
