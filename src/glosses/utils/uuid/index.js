const uuid = adone.lazify({
    __: "./__",
    v1: "./v1",
    v3: () => uuid.__.v35("v3", 0x30, uuid.__.md5),
    v4: "./v4",
    v5: () => uuid.__.v35("v5", 0x50, uuid.__.sha1)
}, exports, require);
