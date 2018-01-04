const {
    is,
    fs,
    std,
    noop,
    promise,
    collection
} = adone;

let emfileTimeout = 0; // EMFILE handling

class Remover {
    constructor(path, {
        glob = true,
        maxBusyTries = 3,
        emfileWait = 1000,
        cwd = process.cwd(),
        dryRun = false
    } = {}) {
        this.path = path;
        this.glob = glob;
        this.maxBusyTries = maxBusyTries;
        this.emfileWait = emfileWait;
        this.cwd = cwd;
        this.dryRun = dryRun;
        this.lstatCache = null;
        this.deleted = [];
        this.lstatCache = new collection.MapCache();
        this.ignoredMatchers = [];
    }

    isIgnored(p) {
        for (const m of this.ignoredMatchers) {
            if (m(p)) {
                return true;
            }
        }
        return false;
    }

    ignore(p) {
        if (is.glob(p)) {
            this.ignoredMatchers.push(adone.util.match.matcher(p));
        } else {
            this.ignoredMatchers.push((x) => x === p);
        }
    }

    async lstat(p) {
        // TODO: generalize it somehow??

        let promise;
        if (this.lstatCache.has(p)) {
            promise = this.lstatCache.get(p);
        } else {
            promise = fs.lstat(p).catch(noop);
            this.lstatCache.set(p, promise);
        }

        const res = await promise;

        if (is.error(res)) {
            throw res;
        }
        return res;
    }

    async unlinkFile(p) {
        if (!this.dryRun) {
            await fs.unlink(p);
        }
        this.deleted.push(p);
    }

    async unlinkDir(p) {
        if (!this.dryRun) {
            await fs.rmdir(p);
        }
        this.deleted.push(`${p}${std.path.sep}`);
    }

    async fixWinEPERM(p) {
        await fs.chmod(p, 0o666);
        try {
            return await fs.stat(p);
        } catch (err) {
            if (err.code === "ENOENT") {
                return null; // has been deleted
            }
            throw err;
        }
    }

    async rmfile(p) {
        if (this.isIgnored(p)) {
            return false;
        }
        // sunos lets the root user unlink directories, which is... weird.
        // so we have to lstat here and make sure it's not a dir.
        let st;
        try {
            st = await this.lstat(p);
        } catch (err) {
            if (err.code === "ENOENT") {
                st = null;
            } else if (err.code === "EPERM" && is.windows) {
                // Windows can EPERM on stat. Life is suffering.
                st = await this.fixWinEPERM(p);
            }
        }

        if (is.null(st)) {
            return true;
        }

        if (st.isDirectory()) {
            return this.rmdir(p);
        }

        try {
            await this.unlinkFile(p);
        } catch (err) {
            if (err.code === "ENOENT") {
                return true; // has been deleted
            }
            if (err.code === "EPERM") {
                if (is.windows) {
                    await this.fixWinEPERM(p);
                }
                return this.rmdir(p);
            }
            if (err.code === "EISDIR") {
                return this.rmdir(p);
            }
            throw err;
        }

        return true;
    }

    // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
    // if we guessed wrong, and it's not a directory, then
    // raise the original error.
    async rmdir(p) {
        if (this.isIgnored(p)) {
            return false;
        }
        try {
            await this.unlinkDir(p);
        } catch (err) {
            if (err.code === "ENOENT") {
                return true; // has been deleted
            }
            if (err.code === "ENOTEMPTY" || err.code === "EEXIST" || err.code === "EPERM") {
                if (await this.rmkids(p)) {
                    await this.rmdir(p);
                    return true;
                }
                return false;
            }
            throw err;
        }
        return true;
    }

    async rmkids(p) {
        const files = await fs.readdir(p);
        if (files.length === 0) {
            return true;
        }
        let error = null;
        const errorHandler = (err) => {
            error = error || err;
        };
        let hasIgnored = false;
        const processes = files.map((x) => this.rmfile(std.path.join(p, x)).catch(errorHandler)); // eslint-disable-line no-use-before-define
        for (const process of processes) {
            if (await process) { // eslint-disable-line no-await-in-loop
                hasIgnored = true;
            }
        }

        if (error) {
            throw error;
        }

        return hasIgnored;
    }

    resolveInput(x) {
        let ignored = false;
        if (x[0] === "!") {
            ignored = true;
            x = x.slice(1);
        }
        x = x.replace(/[\\/]+/g, std.path.sep);
        x = std.path.resolve(this.cwd, x);
        if (ignored) {
            x = `!${x}`;
        }
        return x;
    }

    async start() {
        const files = [];
        const path = adone.util.arrify(this.path).map((x) => this.resolveInput(x));

        if (path.length === 0) {
            return;
        }

        let hasGlob = false;

        if (this.glob) {
            for (const p of path) {
                if (is.glob(p)) {
                    hasGlob = true;
                    break;
                }
            }
        }

        if (hasGlob) {
            // handle everything via glob
            const res = await fs.glob(path, {
                cwd: this.cwd,
                ...(is.plainObject(this.glob) ? this.glob : undefined),
                lstatCache: this.lstatCache
            });
            for (const i of res) {
                files.push(std.path.resolve(this.cwd, i));
            }
            for (const i of path) {
                if (i[0] === "!") {
                    this.ignore(i.slice(1));
                }
            }
        } else {
            files.push(...path);
        }

        if (files.length === 0) {
            return;
        }

        let busyTries = 0;
        let error = null;
        const errorHandler = (err) => error = error || err;

        const processes = files.map((x) => {
            const resolve = () => {
                emfileTimeout = 0;
            };
            const reject = (err) => {
                if (err.code === "ENOENT") {
                    return; // has been deleted
                }
                if (err.code === "EBUSY" || err.code === "ENOTEMPTY" || err.code === "EPERM" && busyTries < this.maxBusyTries) {
                    ++busyTries;
                    const time = busyTries * 100;
                    return promise.delay(time).then(() => this.rmfile(x)).catch(errorHandler); // just do the same after the delay
                }
                if (err.code === "EMFILE" && emfileTimeout < this.emfileWait) {
                    return promise.delay(emfileTimeout++).then(() => this.rmfile(x)).catch(errorHandler);
                }
            };

            return this.rmfile(x).then(resolve, reject).catch(errorHandler);
        });

        for (const process of processes) {
            await process; // eslint-disable-line no-await-in-loop
        }
        if (error) {
            throw error;
        }
    }
}

export default async function rm(path, options) {
    const remover = new Remover(path, options);
    try {
        await remover.start();
    } catch (err) {
        err.deleted = remover.deleted; // ???
        throw err;
    }
    return remover.deleted;
};

rm.Remover = Remover;
