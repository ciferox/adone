const { is, fs, std, noop, promise } = adone;

let emfileTimeout = 0; // EMFILE handling

const rmkids = async (p) => {
    const files = await fs.readdir(p);
    if (files.length === 0) {
        return;
    }
    let error = null;
    const errorHandler = (err) => error = error || err;
    const processes = files.map((x) => rmfile(std.path.join(p, x)).catch(errorHandler)); // eslint-disable-line no-use-before-define
    for (const process of processes) {
        await process; // eslint-disable-line no-await-in-loop
    }
    if (error) {
        return Promise.reject(error);
    }
};

// try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
// if we guessed wrong, and it's not a directory, then
// raise the original error.
const rmdir = (p) => fs.rmdir(p).catch((err) => {
    if (err.code === "ENOENT") {
        return; // has been deleted
    }
    if (err.code === "ENOTEMPTY" || err.code === "EEXIST" || err.code === "EPERM") {
        return rmkids(p).then(() => fs.rmdir(p));
    }
    return Promise.reject(err);
});

const fixWinEPERM = (p) => fs.chmod(p, 0o666).then(() => fs.stat(p)).catch((err) => {
    if (err.code === "ENOENT") {
        return null; // has been deleted
    }
    return Promise.reject(err);
});

const rmfile = async (p) => {
    // sunos lets the root user unlink directories, which is... weird.
    // so we have to lstat here and make sure it's not a dir.
    const st = await fs.lstat(p).catch((err) => {
        if (err.code === "ENOENT") {
            return null;
        }
        // Windows can EPERM on stat.  Life is suffering.
        if (err.code === "EPERM" && is.windows) {
            return fixWinEPERM(p);
        }
    });

    if (is.null(st)) {
        return;
    }

    if (st.isDirectory()) {
        return rmdir(p);
    }

    return fs.unlink(p).catch((err) => {
        if (err.code === "ENOENT") {
            return; // has been deleted
        }
        if (err.code === "EPERM") {
            if (is.windows) {
                return fixWinEPERM(p).then(() => rmdir(p));
            }
            return rmdir(p);
        }
        if (err.code === "EISDIR") {
            return rmdir(p);
        }
        return Promise.reject(err);
    });
};

// TODO: should return array of deleted files.
export default async function rm(path, { glob = true, maxBusyTries = 3, emfileWait = 1000, cwd = process.cwd() } = {}) {
    const afterGlob = async (results) => {
        if (results.length === 0) {
            return;
        }

        let busyTries = 0;
        let error = null;
        const errorHandler = (err) => error = error || err;

        const processes = results.map((x) => {
            const resolve = () => {
                emfileTimeout = 0;
            };
            const reject = (err) => {
                if (err.code === "ENOENT") {
                    return; // has been deleted
                }
                if (err.code === "EBUSY" || err.code === "ENOTEMPTY" || err.code === "EPERM" && busyTries < maxBusyTries) {
                    ++busyTries;
                    const time = busyTries * 100;
                    return promise.delay(time).then(() => rmfile(x)).catch(errorHandler); // just do the same after the delay
                }
                if (err.code === "EMFILE" && emfileTimeout < emfileWait) {
                    return promise.delay(emfileTimeout++).then(() => rmfile(x)).catch(errorHandler);
                }
            };

            return rmfile(x).then(resolve, reject).catch(errorHandler);
        });

        for (const process of processes) {
            await process; // eslint-disable-line no-await-in-loop
        }
        if (error) {
            return Promise.reject(error);
        }
    };

    if (is.string(path)) {
        path = std.path.resolve(cwd, path);

        if (!glob || !is.glob(path)) {
            return afterGlob([path]);
        }

        const st = await fs.lstat(path).catch(noop);
        if (st) { // directory or file
            return afterGlob([path]);
        }
    }

    return afterGlob((await fs.glob(path, {
        cwd,
        ...(is.plainObject(glob) ? glob : undefined)
    }).map((x) => std.path.resolve(cwd, x))));
};
