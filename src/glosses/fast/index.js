const { lazify, std, util, is, x, core: { Core } } = adone;

const fast = lazify({
    File: "./file",
    helpers: "./helpers"
}, exports, require);

// Plugins
export const plugin = lazify({
    transpile: "./transforms/transpile",
    if: "./transforms/if",
    deleteLines: "./transforms/delete-lines",
    rename: "./transforms/rename",
    concat: "./transforms/concat",
    flatten: "./transforms/flatten",
    sourcemaps: "./transforms/sourcemaps",
    wrap: "./transforms/wrap",
    replace: "./transforms/replace",
    revisionHash: "./transforms/revision_hash",
    revisionHashReplace: "./transforms/revision_hash_replace",
    Filter: "./transforms/filter",
    useref: "./transforms/useref",
    sass: "./transforms/sass",
    angularFilesort: "./transforms/angular/file_sort",
    angularTemplateCache: "./transforms/angular/template_cache",
    inject: "./transforms/inject",
    chmod: "./transforms/chmod",
    notify: "./transforms/notify",
    wiredep: "./transforms/wiredep"
}, null, require);

export class Fast extends Core {
    transpile(options) {
        return this.pipe(plugin.transpile(options));
    }

    deleteLines(options) {
        return this.pipe(plugin.deleteLines(options));
    }

    if(condition, trueStream, falseStream) {
        return this.pipe(plugin.if(condition, trueStream, falseStream));
    }

    rename(handler) {
        return this.pipe(plugin.rename(handler));
    }

    concat(file, options) {
        return this.pipe(plugin.concat(file, options));
    }

    flatten(file, options) {
        return this.pipe(plugin.flatten(file, options));
    }

    sourcemapsInit(options) {
        return this.pipe(plugin.sourcemaps.init(options));
    }

    sourcemapsWrite(destPath, options) {
        return this.pipe(plugin.sourcemaps.write(destPath, options));
    }

    revisionHash({ manifest } = {}) {
        if (manifest) {
            return this.pipe(plugin.revisionHash.manifest(manifest));
        }
        return this.pipe(plugin.revisionHash.rev());
    }

    revisionHashReplace(options) {
        return this.pipe(plugin.revisionHashReplace(options));
    }

    wrap(template, data, options) {
        return this.pipe(plugin.wrap(template, data, options));
    }

    replace(search, replacement) {
        return this.pipe(plugin.replace(search, replacement));
    }

    stash(name, filter) {
        if (!this._filter) {
            this._filter = new plugin.Filter();
        }
        return this.pipe(this._filter.stash(name, filter));
    }

    unstash(name) {
        return this.pipe(this._filter.unstash(name));
    }

    useref(options = {}) {
        return this.pipe(plugin.useref(options));
    }

    sass(options) {
        return this.pipe(plugin.sass(options));
    }

    angularFilesort() {
        return this.pipe(plugin.angularFilesort());
    }

    angularTemplateCache(filename, options) {
        return this.pipe(plugin.angularTemplateCache(filename, options));
    }

    inject(sources, options) {
        return this.pipe(plugin.inject(sources, options));
    }

    chmod(mode, dirMode) {
        return this.pipe(plugin.chmod(mode, dirMode));
    }

    notify(options) {
        return this.pipe(plugin.notify(options));
    }

    wiredep(options) {
        return this.pipe(plugin.wiredep.stream(options));
    }

    decompress(compressorName, options = {}) {
        if (!(compressorName in adone.compressor)) {
            throw new x.InvalidArgument(`Unknown compressor: ${compressorName}`);
        }

        const { decompress, decompressStream } = adone.compressor[compressorName];

        return this.through(async function decompressing(file) {
            if (file.isStream()) {
                file.contents = file.contents.pipe(decompressStream(options));
            } else if (file.isBuffer()) {
                file.contents = await decompress(file.contents, options);
            }
            this.push(file);
        });
    }

    compress(compressorType, options = {}) {
        if (!(compressorType in adone.compressor)) {
            throw new adone.x.InvalidArgument(`Unknown compressor: ${compressorType}`);
        }

        const { compress, compressStream } = adone.compressor[compressorType];
        const extname = {
            lzma: "lzma",
            gz: "gz",
            xz: "xz",
            brotli: "br",
            deflate: "deflate"  // ?
        }[compressorType];

        return this.through(async function compressor(file) {
            if (file.isStream()) {
                file.contents = file.contents.pipe(compressStream(options));
            } else if (file.isBuffer()) {
                file.contents = await compress(file.contents, options);
            }
            if (options.rename !== false) {
                file.extname = `${file.extname}.${extname}`;
            }
            this.push(file);
        });
    }

    pack(archiveType, packerOptions = {}) {
        if (!(archiveType in adone.archive)) {
            throw new x.InvalidArgument(`Unknown archive type: ${archiveType}`);
        }
        if (is.string(packerOptions)) {
            packerOptions = { filename: packerOptions };
        }
        if (!is.string(packerOptions.filename)) {
            throw new x.InvalidArgument("Filename is required");
        }
        const archive = adone.archive[archiveType];
        const stream = new archive.RawPackStream();
        const self = this;
        return this.through(async (file) => {
            if (file.isNull() && !file.isSymbolic()) {
                // ok? add an empty file?
                return;
            }
            const header = {
                name: file.relative,
                mode: file.stat && file.stat.mode,
                mtime: file.stat && file.stat.mtime,
                type: file.isSymbolic() ? "symlink" : "file"
            };
            if (file.isSymbolic()) {
                header.linkname = file.symlink;
                stream.entry(header);
                return;
            }
            if (file.isBuffer()) {
                stream.entry(header, file.contents);
            } else {
                // stream
                // ..
                let data = await file.contents.pipe(adone.stream.concat());
                if (data.length === 0) {
                    // nothing was written, empty file
                    data = Buffer.alloc(0);
                }
                stream.entry(header, data);
            }
        }, function flush() {
            stream.finalize();
            const cwd = packerOptions.cwd || self._cwd || process.cwd();
            const base = packerOptions.base || cwd;
            const file = new fast.File({
                path: std.path.resolve(base, packerOptions.filename),
                cwd: packerOptions.cwd || this._cwd || process.cwd(),
                base: packerOptions.base || null,
                contents: stream
            });
            this.push(file);
        });
    }

    extract(archiveType, extractorOptions = {}) {
        if (!(archiveType in adone.archive)) {
            throw new x.InvalidArgument(`Unknown archive type: ${archiveType}`);
        }
        const archive = adone.archive[archiveType];

        return this.through(async function extracting(file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }
            const isBuffer = file.isBuffer();
            const stream = new archive.RawExtractStream(extractorOptions);
            const p = new Promise((resolve, reject) => {
                stream.on("entry", (header, stream, next) => {
                    if (header.type !== "file") {
                        // just ignore
                        return next();
                    }
                    const entryFile = file.clone();
                    entryFile.path = std.path.resolve(entryFile.base, header.name);
                    entryFile.stat = entryFile.stat || new std.fs.Stats();
                    entryFile.stat.mtime = header.mtime;
                    entryFile.stat.mode = header.mode;

                    if (isBuffer) {
                        stream.pipe(adone.stream.concat()).then((data) => {
                            if (is.array(data)) {
                                data = Buffer.alloc(0);
                            }
                            entryFile.contents = data;
                            this.push(entryFile);
                            next();
                        }).catch((err) => {
                            next(err);  // will destroy the stream and emit the error
                        });
                    } else {
                        entryFile.contents = stream;
                    }
                });
                stream.once("finish", resolve);
                stream.once("error", (err) => {
                    if (!isBuffer) {
                        file.contents.close();
                    }
                    stream.destroy();
                    reject(err);
                });
            });
            if (isBuffer) {
                stream.end(file.contents);
            } else {
                file.contents.pipe(stream);
            }
            await p;
        });
    }
}

adone.tag.set(Fast, adone.tag.FAST_STREAM);

export class FastFS extends Fast {
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
        produceFiles = false
    } = {}) {
        const isDirFunction = is.function(dir);
        if (!isDirFunction) {
            dir = std.path.resolve(cwd, dir);
        }
        return this.through(async function writing(file) {
            if (file.isNull()) {
                file.contents = Buffer.alloc(0);
            }
            const destPath = isDirFunction ? dir(file) : std.path.resolve(dir, file.relative);
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
                file.base = dirname;
                file.path = destPath;
                await fast.helpers.updateMetadata(fd, file);
            } finally {
                await adone.fs.fd.close(fd);
            }
            if (produceFiles) {
                this.push(file);
            }
        });
    }
}

adone.tag.set(FastFS, adone.tag.FAST_FS_STREAM);

const resolveGlob = (glob, cwd) => {
    if (glob[0] === "!") {
        return `!${adone.std.path.resolve(cwd, glob.slice(1))}`;
    }
    return adone.std.path.resolve(cwd, glob);
};

const globSource = (globs, { cwd = process.cwd(), base = null, dot = true, links = false } = {}) => {
    let globsParents;
    if (!base) {
        globsParents = globs.map((x) => util.globParent(x));
    }
    return adone.fs.glob(globs, { dot, patternIndex: true })
        .through(async function fileWrapper({ path, patternIndex }) {
            const stat = await (links ? adone.fs.lstat : adone.fs.stat)(path);
            if (stat.isDirectory()) {
                return;
            }
            const _base = base || globsParents[patternIndex];
            this.push(new fast.File({
                cwd,
                base: _base,
                path,
                contents: null,
                stat,  // TODO, it should be handled by the glob
                symlink: stat.isSymbolicLink() ? await adone.fs.readlink(path) : null
            }));
        });
};

export const src = (globs, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true,
    links = false
} = {}) => {
    globs = util.arrify(globs).map((x) => resolveGlob(x, cwd));
    const source = globSource(globs, { cwd, base, dot, links });
    const fast = new FastFS(source, { read, buffer, stream, cwd });
    fast.once("end", () => source.end({ force: true }));
    return fast;
};

class FastFSMapper extends FastFS {
    constructor(source, mappings, options) {
        super(source, options);
        this._mappings = mappings;
        this._matchers = mappings.map((x) => (y) => util.match(x.from, y, { dot: options.dot }));
    }

    dest(options) {
        const cwd = options.cwd || this._cwd;
        return super.dest((file) => {
            let match = null;
            const sourcePath = file.history[0];
            for (let i = 0; i < this._matchers.length; ++i) {
                if (this._matchers[i](sourcePath)) {
                    if (match !== null) {
                        throw new adone.x.Exception(`Ambiguity. This file "${sourcePath}" has more than one possible source: "${this._mappings[match].from}" or "${this._mappings[i].from}"`);
                    }
                    match = i;
                }
            }
            if (match === null) {
                throw new adone.x.Exception(`Invalid file: "${sourcePath}". There is no matching source`);
            }

            const resolvedDir = std.path.resolve(cwd, this._mappings[match].to);
            return std.path.resolve(resolvedDir, file.relative);
        }, options);
    }
}

export const map = (mappings, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true
} = {}) => {
    mappings = util.arrify(mappings).map(({ from, to }) => {
        return { from: resolveGlob(from, cwd), to };
    });
    const source = globSource(mappings.map((x) => x.from), { cwd, base, dot });
    const fast = new FastFSMapper(source, mappings, { read, buffer, stream, cwd, dot });
    fast.once("end", () => source.end({ force: true }));
    return fast;
};


export const watchSource = (globs, {
    cwd = process.cwd(),
    base = null,
    dot = true,
    ...watcherOptions
} = {}) => {
    let globsParents;
    if (!base) {
        globsParents = globs.map((x) => adone.util.globParent(x));
    }

    const stream = adone.core(null, {
        flush: () => {
            // eslint-disable-next-line no-use-before-define
            watcher.close();
        }
    });

    const watcher = adone.fs.watch(globs, {
        alwaysStat: true,
        ignoreInitial: true,
        ...watcherOptions
    }).on("all", (event, path, stat) => {
        if (event !== "add" && event !== "change") {
            return;
        }
        if (!dot) {
            const filename = std.path.basename(path);
            if (filename[0] === ".") {
                return;
            }
        }
        let _base = base;
        if (!_base) {
            const i = util.match(globs, path, { index: true, dot: true });
            _base = std.path.resolve(cwd, globsParents[i]);
        }
        stream.write(new fast.File({
            cwd,
            base: _base,
            path,
            contents: null,
            stat
        }));
    });


    return stream;
};

adone.tag.set(FastFSMapper, adone.tag.FAST_FS_MAP_STREAM);

export const watch = (globs, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true,
    resume = true,
    ...watcherOptions
} = {}) => {
    globs = util.arrify(globs).map((x) => resolveGlob(x, cwd));
    const source = watchSource(globs, { cwd, base, dot, ...watcherOptions });
    const fast = new FastFS(source, { read, buffer, stream, cwd });
    fast.once("end", () => source.end({ force: true }));
    if (resume) {
        process.nextTick(() => fast.resume());
    }
    return fast;
};

export const watchMap = (mappings, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true,
    resume = true,
    ...watcherOptions
} = {}) => {
    mappings = util.arrify(mappings).map(({ from, to }) => {
        return { from: resolveGlob(from, cwd), to };
    });
    const source = watchSource(mappings.map((x) => x.from), { cwd, base, dot, ...watcherOptions });
    const fast = new FastFSMapper(source, mappings, { read, buffer, stream, cwd, dot });
    fast.once("end", () => source.end({ force: true }));
    if (resume) {
        process.nextTick(() => fast.resume());
    }
    return fast;
};
