const {
    lazify
} = adone;

// predicates
adone.definePredicate("fastStream", "FAST_STREAM");
adone.definePredicate("fastLocalStream", "FAST_LOCAL_STREAM");
adone.definePredicate("fastLocalMapStream", "FAST_LOCAL_MAP_STREAM");

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
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    Concat: "./__/concat",
    helper: "./__/helpers"
}, exports, require);

fast.plugin = lazify({
    compress: "./plugins/compress",
    decompres: "./plugins/decompress",
    pack: "./plugins/pack",
    unpack: "./plugins/unpack",
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
    useref: "./plugins/useref",
    sass: "./plugins/sass",
    angularFilesort: "./plugins/angular/file_sort",
    angularTemplateCache: "./plugins/angular/template_cache",
    inject: "./plugins/inject",
    chmod: "./plugins/chmod",
    notify: "./plugins/notify",
    notifyError: "./plugins/notify",
    wiredep: "./plugins/wiredep"
}, null, require, {
    mapper: (key, mod) => mod
});

