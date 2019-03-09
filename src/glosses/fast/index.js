const {
    lazify,
    asNamespace
} = adone;

const fast = lazify({
    File: "./file",
    Stream: "./stream",
    LocalStream: ["./local_stream", (mod) => mod.FastLocalStream],
    src: ["./local_stream", (mod) => mod.src],
    watchSource: ["./local_stream", (mod) => mod.watchSource],
    watch: ["./local_stream", (mod) => mod.watch],
    LocalMapStream: ["./local_map_stream", (mod) => mod.FastLocalMapStream],
    map: ["./local_map_stream", (mod) => mod.map],
    watchMap: ["./local_map_stream", (mod) => mod.watchMap]
}, asNamespace(exports), require);

adone.lazifyPrivate({
    Concat: "./__/concat",
    helper: "./__/helpers"
}, exports, require);

fast.extension = asNamespace(lazify({
    compress: "./plugins/compress",
    decompress: "./plugins/decompress",
    pack: "./plugins/pack",
    unpack: "./plugins/unpack",
    archive: "./plugins/archive",
    transpile: "./plugins/transpile",
    deleteLines: "./plugins/delete_lines",
    rename: "./plugins/rename",
    concat: "./plugins/concat",
    flatten: "./plugins/flatten",
    sourcemapsInit: "./plugins/sourcemaps",
    sourcemapsWrite: "./plugins/sourcemaps",
    wrap: "./plugins/wrap",
    replace: "./plugins/replace",
    revisionHash: "./plugins/revision_hash",
    revisionHashReplace: "./plugins/revision_hash_replace",
    chmod: "./plugins/chmod",
    notify: "./plugins/notify",
    notifyError: "./plugins/notify"
}, null, require, {
    mapper: (key, mod) => mod
}));
