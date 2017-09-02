adone.lazify({
    tar: () => adone.lazify({
        RawPackStream: "./tar/raw/pack",
        RawExtractStream: "./tar/raw/extract",
        packStream: ["./tar", (mod) => mod.packStream],
        extractStream: ["./tar", (mod) => mod.extractStream]
    }, null, require),
    zip: () => adone.lazify({
        pack: "./zip/pack",
        unpack: "./zip/unpack"
    }, null, require)
}, adone.asNamespace(exports), require);
