import adone from "adone";
const { is, fs, std, noop } = adone;

let emfileTimeout = 0;  // EMFILE handling

const rmkids = async (p) => {
    const files = await fs.readdir(p);
    if (files.length === 0) {
        return;
    }
    const processes = files.map((x) => rmfile(std.path.join(p, x)));  // eslint-disable-line no-use-before-define
    let error = null;
    const errorHandler = (err) => error = error || err;
    for (const process of processes) {
        await process.catch(errorHandler);  // eslint-disable-line no-await-in-loop
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
        return;  // has been deleted
    }
    if (err.code === "ENOTEMPTY" || err.code === "EEXIST" || err.code === "EPERM") {
        return rmkids(p).then(() => fs.rmdir(p));
    }
    return Promise.reject(err);
});

const fixWinEPERM = (p) => fs.chmod(p, 0o666).then(() => fs.stat(p)).catch((err) => {
    if (err.code === "ENOENT") {
        return null;  // has been deleted
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
        if (err.code === "EPERM" && is.win32) {
            return fixWinEPERM(p);
        }
    });

    if (st === null) {
        return;
    }

    if (st.isDirectory()) {
        return rmdir(p);
    }

    return fs.unlink(p).catch((err) => {
        if (err.code === "ENOENT") {
            return;  // has been deleted
        }
        if (err.code === "EPERM") {
            if (is.win32) {
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

const rm = async (path, { glob = true, maxBusyTries = 3, emfileWait = 1000, cwd = process.cwd() } = {}) => {
    const afterGlob = async (results) => {
        if (results.length === 0) {
            return;
        }

        let busyTries = 0;

        const processes = results.map((x) => {
            const resolve = () => {
                emfileTimeout = 0;
            };
            const reject = (err) => {
                if (err.code === "ENOENT") {
                    return;  // has been deleted
                }
                if (err.code === "EBUSY" || err.code === "ENOTEMPTY" || err.code === "EPERM" && busyTries < maxBusyTries) {
                    ++busyTries;
                    const time = busyTries * 100;
                    return adone.promise.delay(time).then(() => rmfile(x));  // just do the same after the delay
                }
                if (err.code === "EMFILE" && emfileTimeout < emfileWait) {
                    return adone.promise.delay(emfileTimeout++).then(() => rmfile(x));
                }
            };

            return rmfile(x).then(resolve, reject);
        });

        let error = null;
        const errorHandler = (err) => error = error || err;

        for (const process of processes) {
            // eslint-disable-next-line no-await-in-loop
            await process.catch(errorHandler);
        }
        if (error) {
            return Promise.reject(error);
        }
    };

    path = std.path.resolve(cwd, path);

    if (!glob || !is.glob(path)) {
        return afterGlob([path]);
    }

    const st = await fs.lstat(path).catch(noop);
    if (st) {  // directory or file
        return afterGlob([path]);
    }
    return afterGlob(await adone.fs.glob(path, glob));
};

export default rm;
