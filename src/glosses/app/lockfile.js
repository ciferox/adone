const {
    is,
    fs,
    std,
    util: { retry }
} = adone;

const { locks } = adone.private(adone.app);

adone.asNamespace(exports);

const isLockStale = (stat, options) => stat.mtime.getTime() < Date.now() - options.stale;

export const getLockFile = (file, options) => options.lockfilePath || `${file}.lock`;

const canonicalPath = (file, options) => {
    if (!options.realpath) {
        return std.path.resolve(file);
    }

    // Use realpath to resolve symlinks. It also resolves relative paths.
    return options.fs.realpath(file);
};

const acquireLock = async (file, options) => {
    // Use mkdir to create the lockfile (atomic operation)
    try {
        await options.fs.mkdir(getLockFile(file, options));
    } catch (err) {
        // If error is not EEXIST then some other error occurred while locking
        if (err.code !== "EEXIST") {
            throw err;
        }

        // Otherwise, check if lock is stale by analyzing the file mtime
        if (options.stale <= 0) {
            throw Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file });
        }

        let stat;
        try {
            stat = await options.fs.stat(getLockFile(file, options));
        } catch (err1) {
            // Retry if the lockfile has been removed (meanwhile)
            // Skip stale check to avoid recursiveness
            if (err1.code === "ENOENT") {
                return acquireLock(file, Object.assign({}, options, { stale: 0 }));
            }

            throw err1;
        }

        if (!isLockStale(stat, options)) {
            throw Object.assign(new Error("Lock file is already being hold"), { code: "ELOCKED", file });
        }

        // If it's stale, remove it and try again!
        // Skip stale check to avoid recursiveness
        await options.fs.rm(getLockFile(file, options));

        return acquireLock(file, Object.assign({}, options, { stale: 0 }));
    }
};

const compromisedLock = (file, lock, err) => {
    lock.released = true; // Signal the lock has been released

    lock.updateTimeout && clearTimeout(lock.updateTimeout); // Cancel lock mtime update

    if (locks[file] === lock) {
        delete locks[file];
    }

    lock.compromised(err);
};

const updateLock = (file, options) => {
    const lock = locks[file];

    /* istanbul ignore next */
    if (lock.updateTimeout) {
        return;
    }

    lock.updateDelay = lock.updateDelay || options.update;
    lock.updateTimeout = setTimeout(async () => {
        const mtime = Date.now() / 1000;

        lock.updateTimeout = null;
        let error = null;
        try {
            await options.fs.utimes(getLockFile(file, options), mtime, mtime);
        } catch (err) {
            error = err;
        }

        // Ignore if the lock was released
        if (lock.released) {
            return;
        }

        // Verify if we are within the stale threshold
        if (lock.lastUpdate <= Date.now() - options.stale && lock.lastUpdate > Date.now() - options.stale * 2) {
            return compromisedLock(file, lock, Object.assign(new Error(lock.updateError || "Unable to update lock within the stale threshold"), {
                code: "ECOMPROMISED"
            }));
        }

        // If the file is older than (stale * 2), we assume the clock is moved manually,
        // which we consider a valid case

        // If it failed to update the lockfile, keep trying unless
        // the lockfile was deleted!
        if (error) {
            if (error.code === "ENOENT") {
                return compromisedLock(file, lock, Object.assign(error, { code: "ECOMPROMISED" }));
            }

            lock.updateError = error;
            lock.updateDelay = 1000;
            return updateLock(file, options);
        }

        // All ok, keep updating..
        lock.lastUpdate = Date.now();
        lock.updateError = null;
        lock.updateDelay = null;
        updateLock(file, options);
    }, lock.updateDelay);

    // Unref the timer so that the nodejs process can exit freely
    // This is safe because all acquired locks will be automatically released
    // on process exit

    // We first check that `lock.updateTimeout.unref` exists because some users
    // may be using this module outside of NodeJS (e.g., in an electron app), 
    // and in those cases `setTimeout` return an integer.
    if (lock.updateTimeout.unref) {
        lock.updateTimeout.unref();
    }
};

export const release = async (file, options) => {
    options = Object.assign({
        fs,
        realpath: true
    }, options);

    // Resolve to a canonical file path
    const realFile = await canonicalPath(file, options);
    // Skip if the lock is not acquired
    const lock = locks[realFile];

    if (!lock) {
        throw Object.assign(new Error("Lock is not acquired/owned by you"), { code: "ENOTACQUIRED" });
    }

    lock.updateTimeout && clearTimeout(lock.updateTimeout); // Cancel lock mtime update
    lock.released = true; // Signal the lock has been released
    delete locks[realFile]; // Delete from locks

    return options.fs.rm(getLockFile(realFile, options));
};

export const create = async (file, options, compromised = (err) => {
    throw err;
}) => {
    options = Object.assign({
        stale: 10000,
        update: null,
        realpath: true,
        retries: 0,
        fs
    }, options);

    options.retries = options.retries || 0;
    options.retries = is.number(options.retries) ? { retries: options.retries } : options.retries;
    options.stale = Math.max(options.stale || 0, 2000);
    options.update = is.nil(options.update) ? options.stale / 2 : options.update || 0;
    options.update = Math.max(Math.min(options.update, options.stale / 2), 1000);

    // Resolve to a canonical file path
    const realFile = await canonicalPath(file, options);

    // Attempt to acquire the lock
    const operation = retry.operation(options.retries);

    return new Promise((resolve, reject) => {
        operation.attempt(async () => {
            try {
                await acquireLock(realFile, options);
            } catch (err) {
                if (operation.retry(err)) {
                    return;
                }

                return reject(operation.mainError());
            }

            // We now own the lock
            const lock = locks[realFile] = {
                options,
                compromised,
                lastUpdate: Date.now()
            };

            // We must keep the lock fresh to avoid staleness
            updateLock(realFile, options);

            resolve(() => {
                if (lock.released) {
                    throw Object.assign(new Error("Lock is already released"), { code: "ERELEASED" });
                }

                // Not necessary to use realpath twice when releasing
                return release(realFile, Object.assign({}, options, { realpath: false }));
            });
        });
    });
};

export const check = async (file, options) => {
    options = Object.assign({
        stale: 10000,
        realpath: true,
        fs
    }, options);

    options.stale = Math.max(options.stale || 0, 2000);

    // Resolve to a canonical file path
    const realFile = await canonicalPath(file, options);

    try {
        const stat = await options.fs.stat(getLockFile(realFile, options));

        return (options.stale <= 0) ? true : !isLockStale(stat, options);
    } catch (err) {
        // if does not exist, file is not locked. Otherwise, callback with error
        if (err.code === "ENOENT") {
            return false;
        }
        throw err;
    }
};
