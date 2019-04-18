const {
    event: { Emitter },
    error,
    fs,
    promise,
    std: { path }
} = adone;

class FileCopier extends Emitter {
    #defer = promise.defer();

    constructor(src, dst, { overwrite = true, progress = false } = {}) {
        super();

        this.src = src;
        this.dst = dst;
        this.overwrite = overwrite;
        this.progress = progress;
    }

    async start() {
        const overwrite = Boolean(this.overwrite);
        const progress = Boolean(this.progress);
        
        process.nextTick(async () => {
            try {
                const readStream = fs.createReadStream(this.src);
                await fs.mkdirp(path.dirname(this.dst));
                const writeStream = fs.createWriteStream(this.dst, { flags: overwrite ? "w" : "wx" });
                if (progress) {
                    const stat = await fs.stat(this.src);
                    this.size = stat.size;

                    readStream.on("data", () => {
                        this.#written(writeStream.bytesWritten);
                    });
                }

                writeStream.once("close", () => {
                    this.#written(this.size);

                    fs.lstat(this.src).then((stats) => {
                        Promise.all([
                            fs.utimes(this.dst, stats.atime, stats.mtime),
                            fs.chmod(this.dst, stats.mode),
                            fs.chown(this.dst, stats.uid, stats.gid)
                        ]).then(() => this.#defer.resolve());
                    }, this.#defer.reject);
                });

                writeStream.once("error", (err) => {
                    if (!overwrite && err.code === "EEXIST") {
                        this.#defer.resolve();
                        return;
                    }
                    this.emit("error", err);
                    this.#defer.reject(err);
                });

                readStream.pipe(writeStream);
            } catch (err) {
                this.#defer.reject(err);
            }
        });

        return this;
    }

    then(onResolve, onReject) {
        return this.#defer.promise.then(onResolve, onReject)
    }

    catch(onReject) {
        return this.#defer.promise.catch(onReject);
    }

    #written(val) {
        this.written = val;
        this.progress && this.emit("progress", {
            src: this.src,
            dest: this.dst,
            size: this.size,
            written: val
        });
    }
}

export default async (src, dst, options) => {
    if (!src || !dst) {
        throw new error.CopyException("Source and destination required");
    }

    src = path.resolve(src);
    dst = path.resolve(dst);

    if (!(await fs.isFile(src))) {
        throw new error.CopyException("Source path should point to file");
    }

    const copier = new FileCopier(src, dst, options);

    return copier.start();
};
