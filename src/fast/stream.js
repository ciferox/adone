export default class FastStream extends adone.stream.core.Stream  {
}
adone.tag.add(FastStream, "FAST_STREAM");

adone.lazify({
    compress: "./plugins/compress",
    decompres: "./plugins/decompress",
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
    useref: "./plugins/useref",
    sass: "./plugins/sass",
    angularFilesort: "./plugins/angular/file_sort",
    angularTemplateCache: "./plugins/angular/template_cache",
    inject: "./plugins/inject",
    chmod: "./plugins/chmod",
    notify: "./plugins/notify",
    notifyError: "./plugins/notify",
    wiredep: "./plugins/wiredep"
}, FastStream.prototype, require, {
    mapper: (key, mod) => mod.default(key)
});
