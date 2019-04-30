const {
    lazify,
    asNamespace
} = adone;

const fast = lazify({
    File: "./file",
    Stream: "./stream",
    LocalStream: ["./local_stream", "FastLocalStream"],
    src: ["./local_stream", "src"],
    watchSource: ["./local_stream", "watchSource"],
    watch: ["./local_stream", "watch"],
    LocalMapStream: ["./local_map_stream", "FastLocalMapStream"],
    map: ["./local_map_stream", "map"],
    watchMap: ["./local_map_stream", "watchMap"]
}, asNamespace(exports), require);

adone.lazifyp({
    Concat: "./__/concat",
    helper: "./__/helpers"
}, exports, require);

fast.extension = asNamespace(lazify({
    compress: "./extensions/compress",
    decompress: "./extensions/decompress",
    pack: "./extensions/pack",
    archive: "./extensions/archive",
    extract: "./extensions/extract",
    transpile: "./extensions/transpile",
    deleteLines: "./extensions/delete_lines",
    rename: "./extensions/rename",
    concat: "./extensions/concat",
    flatten: "./extensions/flatten",
    sourcemapsInit: "./extensions/sourcemaps",
    sourcemapsWrite: "./extensions/sourcemaps",
    wrap: "./extensions/wrap",
    replace: "./extensions/replace",
    revisionHash: "./extensions/revision_hash",
    revisionHashReplace: "./extensions/revision_hash_replace",
    chmod: "./extensions/chmod",
    notify: "./extensions/notify",
    notifyError: "./extensions/notify"
}, null, require, {
    mapper: (mod) => mod
}));
