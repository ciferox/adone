adone.lazify({
    tar: () => adone.lazify({
        RawPackStream: "./tar/raw/pack",
        RawUnpackStream: "./tar/raw/unpack",
        packStream: ["./tar", (mod) => mod.packStream],
        unpackStream: ["./tar", (mod) => mod.unpackStream]
    }, null, require),
    zip: () => adone.lazify({
        pack: "./zip/pack",
        unpack: "./zip/unpack"
    }, null, require)
}, adone.asNamespace(exports), require);
