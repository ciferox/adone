const {
    is,
    lazify,
    util,
    stream: { core },
    std
} = adone;

const fast = lazify({
    Stream: "./stream",
    File: "./file"
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
}, null, require);


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
            this.push(new adone.fast.File({
                cwd,
                base: _base,
                path,
                contents: null,
                stat, // TODO, it should be handled by the glob
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
    const fast = new adone.fast.Stream(source, { read, buffer, stream, cwd });
    fast.once("end", () => source.end({ force: true }));
    return fast;
};

class FastFSMapper extends adone.fast.Stream {
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
                    if (!is.null(match)) {
                        throw new adone.x.Exception(`Ambiguity. This file "${sourcePath}" has more than one possible source: "${this._mappings[match].from}" or "${this._mappings[i].from}"`);
                    }
                    match = i;
                }
            }
            if (is.null(match)) {
                throw new adone.x.Exception(`Invalid file: "${sourcePath}". There is no matching source`);
            }

            return std.path.resolve(cwd, this._mappings[match].to);
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

    const stream = core(null, {
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
        stream.write(new adone.fast.File({
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
    const fast = new adone.fast.Stream(source, { read, buffer, stream, cwd });
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
