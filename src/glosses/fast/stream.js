export default class FastStream extends adone.stream.core.Stream {
}

adone.lazify({
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
    useref: "./extensions/useref",
    sass: "./extensions/sass",
    angularFilesort: "./extensions/angular/file_sort",
    angularTemplateCache: "./extensions/angular/template_cache",
    inject: "./extensions/inject",
    chmod: "./extensions/chmod",
    notify: "./extensions/notify",
    notifyError: "./extensions/notify",
    wiredep: "./extensions/wiredep"
}, FastStream.prototype, require, {
    mapper: (mod, key) => mod.default(key)
});
