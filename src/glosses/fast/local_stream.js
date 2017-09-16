const {
    is,
    std,
    util,
    stream: { core }
} = adone;

const {
    helper
} = adone.private(adone.fast);

export class FastLocalStream extends adone.fast.Stream {
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

            const fd = await adone.fs.fd.open(destPath, flag, mode);
            try {
                if (file.isStream()) {
                    await new Promise((resolve, reject) => {
                        const writeStream = std.fs.createWriteStream(null, { fd }).once("error", reject);
                        file.contents.once("error", reject).once("end", resolve);
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
adone.tag.define("FAST_LOCAL_STREAM", "fastLocalStream");
adone.tag.set(FastLocalStream, adone.tag.FAST_LOCAL_STREAM);

export const src = (globs, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true,
    links = false
} = {}) => {
    globs = util.arrify(globs).map((x) => helper.resolveGlob(x, cwd));
    const source = helper.globSource(globs, { cwd, base, dot, links });
    const fast = new FastLocalStream(source, { read, buffer, stream, cwd });
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
    globs = util.arrify(globs).map((x) => helper.resolveGlob(x, cwd));
    const source = watchSource(globs, { cwd, base, dot, ...watcherOptions });
    const fastStream = new FastLocalStream(source, { read, buffer, stream, cwd });
    fastStream.once("end", () => source.end({ force: true }));
    if (resume) {
        process.nextTick(() => fastStream.resume());
    }
    return fastStream;
};
