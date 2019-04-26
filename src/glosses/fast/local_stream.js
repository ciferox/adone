const {
    is,
    fs,
    path: aPath,
    std,
    util,
    stream: { core }
} = adone;

const {
    helper
} = adone.getPrivate(adone.fast);

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
        if (file.isSymbolic() || file.isBuffer() || file.isDirectory()) {
            return file;
        }
        if (file.isNull()) {
            file.contents = await fs.readFile(file.path);
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
        if (file.isSymbolic() || !file.isNull() || file.isDirectory()) {
            return file;
        }
        file.contents = fs.createReadStream(file.path);
        file.contents.pause();
        return file;
    }

    dest(dir, {
        mode = 0o644,
        dirMode = 0o777 & (~process.umask()),
        flag = "w",
        cwd = this._cwd || process.cwd(),
        produceFiles = false,
        originMode = true,
        originTimes = true,
        originOwner = true
    } = {}) {    
        const isDirFunction = is.function(dir);
        if (!isDirFunction) {
            dir = aPath.resolve(cwd, String(dir));
        }
        return this.through(async function writing(file) {    
            if (file.isNull() && !file.isDirectory() && !file.isSymbolic()) {
                return; // ?
            }
            const destBase = isDirFunction ? dir(file) : dir;
            const destPath = aPath.resolve(destBase, file.relative);

            file.stat = file.stat || new fs.Stats();
            file.stat.mode = file.stat.mode || (file.isDirectory() ? dirMode : mode);
            if (file.isDirectory()) {
                await fs.mkdirp(aPath.dirname(destPath), dirMode);
                await fs.mkdirp(destPath, file.stat.mode);
                const fd = await fs.open(destPath, "r");
                try {
                    await helper.updateMetadata(fd, file, { originMode, originTimes, originOwner });
                } finally {
                    await fs.close(fd);
                }
            } else if (file.isSymbolic()) {
                await fs.mkdirp(aPath.dirname(destPath), dirMode);
                await fs.symlink(file.symlink, destPath);
                // cannot change metadata?
            } else {
                await fs.mkdirp(aPath.dirname(destPath), dirMode);
                const fd = await fs.open(destPath, flag, mode);
                try {
                    if (file.isStream()) {
                        await new Promise((resolve, reject) => {
                            const writeStream = fs.createWriteStream(null, { fd, autoClose: false });
                            file.contents.once("error", reject);
                            file.contents.pipe(writeStream).once("error", reject).once("finish", resolve);
                        });
                    } else {
                        // Buffer
                        await fs.write(fd, file.contents);
                    }
                    await helper.updateMetadata(fd, file, { originMode, originTimes, originOwner });
                } finally {
                    await fs.close(fd);
                }
            }

            file.flag = flag;
            file.cwd = cwd;
            file.base = destBase;
            file.path = destPath;

            if (produceFiles) {
                this.push(file);
            }
        });
    }
}

export const src = (globs, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true,
    links = false
} = {}) => {
    globs = util.arrify(globs).map((x) => helper.resolveGlob(String(x), cwd));
    const source = helper.globSource(globs, { cwd, base, dot, links });
    const fastStream = new FastLocalStream(source, { read, buffer, stream, cwd });
    fastStream.once("end", () => source.end({ force: true }));
    return fastStream;
};

export const watchSource = (globs, {
    cwd = process.cwd(),
    base = null,
    dot = true,
    ...watcherOptions
} = {}) => {
    let globsParents;
    if (!base) {
        globsParents = globs.map((x) => adone.glob.parent(x));
    }
    
    const stream = core.create(null, {
        flush: () => {
            // eslint-disable-next-line no-use-before-define
            watcher.close();
        }
    });
    
    const watcher = (new fs.Watcher({
        alwaysStat: true,
        ignoreInitial: true,
        ...watcherOptions
    }).add(globs)).on("all", (event, path, stat) => {
        switch (event) {
            case "add":
            case "change":
            case "addDir":
                break;
            default:
                return;
        }
        if (!dot) {
            const filename = aPath.basename(path);
            if (filename[0] === ".") {
                return;
            }
        }
        
        let _base = base;
        if (!_base) {
            const i = util.matchPath(globs, path, { index: true, dot: true });
            if (i >= 0) {
                _base = aPath.resolve(cwd, globsParents[i]);
            }
            if (!_base || aPath.relative(_base, path).startsWith("..")) {
                return;
            }
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
