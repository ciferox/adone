const {
    is,
    std
} = adone;

const {
    helper
} = adone.private(adone.fast);

export default class FastStream extends adone.stream.CoreStream {
    constructor(source, { read = true, buffer = true, stream = false, cwd = process.cwd() } = {}) {
        super(source);
        if (read) {
            if (stream) {
                buffer = false;
            }
            if (buffer) {
                this.map(this.constructor.bufferReader);
            } else {
                this.map(this.constructor.streamReader);
            }
        }
        this._cwd = cwd;
    }

    static async bufferReader(file) {
        if (file.isSymbolic() || file.isBuffer()) {
            return file;
        }
        if (file.isNull()) {
            file.contents = await adone.fs.readFile(file.path);
        } else {
            const buf = [];
            let len;
            const stream = file.contents;
            await new Promise((resolve, reject) => {
                stream.on("data", (chunk) => {
                    buf.push(chunk);
                    len += chunk.length;
                }).once("end", resolve).once("error", reject);
            });
            file.contents = Buffer.concat(buf, len);
        }
        return file;
    }

    static async streamReader(file) {
        if (file.isSymbolic() || !file.isNull()) {
            return file;
        }
        file.contents = std.fs.createReadStream(file.path);
        file.contents.pause();
        return file;
    }

    dest(dir, {
        mode = 0o644,
        flag = "w",
        cwd = this._cwd || process.cwd(),
        produceFiles = false,
        originMode = true,
        originTimes = true,
        originOwner = true
    } = {}) {
        const isDirFunction = is.function(dir);
        if (!isDirFunction) {
            dir = std.path.resolve(cwd, dir);
        }
        return this.through(async function writing(file) {
            if (file.isNull()) {
                file.contents = Buffer.alloc(0);
            }
            const destBase = isDirFunction ? dir(file) : dir;
            const destPath = std.path.resolve(destBase, file.relative);
            const dirname = std.path.dirname(destPath);

            file.stat = file.stat || new std.fs.Stats();
            file.stat.mode = file.stat.mode || mode;

            await adone.fs.mkdir(dirname);

            const fd = await adone.fs.fd.open(destPath, "w");
            try {
                if (file.isStream()) {
                    await new Promise((resolve, reject) => {
                        const writeStream = std.fs.createWriteStream(null, {
                            fd, mode, flag
                        }).on("error", reject);
                        file.contents.on("error", reject).on("end", resolve);
                        file.contents.pipe(writeStream, { end: false });
                    });
                } else {
                    await adone.fs.fd.write(fd, file.contents);
                }
                file.flag = flag;
                file.cwd = cwd;
                file.base = destBase;
                file.path = destPath;
                await helper.updateMetadata(fd, file, { originMode, originTimes, originOwner });
            } finally {
                await adone.fs.fd.close(fd);
            }
            if (produceFiles) {
                this.push(file);
            }
        });
    }
}
adone.tag.set(FastStream, adone.tag.FAST_STREAM);

adone.lazify({
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
}, FastStream.prototype, require, {
    mapper: (key, mod) => mod.default(key)
});
