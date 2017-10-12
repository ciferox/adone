const {
    fs,
    std: { path, fs: stdFs, child_process: cp }
} = adone;

const { lock, unlock, checkLock } = fs;

describe("fs", "file locking", () => {
    const tmpFileRealPath = path.join(__dirname, "tmp");
    const tmpFile = path.relative(process.cwd(), tmpFileRealPath);
    const tmpFileLock = `${tmpFileRealPath}.lock`;
    const tmpFileSymlinkRealPath = `${tmpFileRealPath}_symlink`;
    const tmpFileSymlink = `${tmpFile}_symlink`;
    const tmpFileSymlinkLock = `${tmpFileSymlinkRealPath}.lock`;
    const tmpNonExistentFile = path.join(__dirname, "nonexistentfile");

    const createPromise = (fn) => new Promise((resolve, reject) => fn(resolve, reject));

    const clearLocks = async () => {
        const promises = [];

        promises.push(createPromise((resolve, reject) => {
            unlock(tmpFile, { realpath: false }, (err) => {
                if (!err || err.code === "ENOTACQUIRED") {
                    return resolve();
                }
                reject(err);
            });
        }));

        promises.push(createPromise((resolve, reject) => {
            unlock(tmpNonExistentFile, { realpath: false }, (err) => {
                if (!err || err.code === "ENOTACQUIRED") {
                    return resolve();
                }
                reject(err);
            });
        }));

        promises.push(createPromise((resolve, reject) => {
            unlock(tmpFileSymlink, { realpath: false }, (err) => {
                if (!err || err.code === "ENOTACQUIRED") {
                    return resolve();
                }
                reject(err);
            });
        }));

        if (await fs.exists(tmpFileSymlink)) {
            promises.push(createPromise((resolve, reject) => {
                unlock(tmpFileSymlink, (err) => {
                    if (!err || err.code === "ENOTACQUIRED") {
                        return resolve();
                    }
                    reject(err);
                });
            }));
        }

        await Promise.all(promises);
        await fs.rm(tmpFile);
        await fs.rm(tmpFileLock);
        await fs.rm(tmpFileSymlink);
        await fs.rm(tmpFileSymlinkLock);
    };

    describe("lock()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            await fs.rm(tmpFileSymlink);
        });

        afterEach(clearLocks);

        it("should fail if the file does not exist by default", (done) => {
            lock(tmpNonExistentFile, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ENOENT");

                done();
            });
        });

        it("should not fail if the file does not exist and realpath is false", (done) => {
            lock(tmpNonExistentFile, { realpath: false }, (err) => {
                assert.isNull(err);

                done();
            });
        });

        it("should fail if impossible to create the lockfile", (done) => {
            lock("nonexistentdir/nonexistentfile", { realpath: false }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ENOENT");

                done();
            });
        });

        it("should create the lockfile", (done) => {
            lock(tmpFile, (err) => {
                assert.isNull(err);
                assert.isTrue(fs.existsSync(tmpFileLock));

                done();
            });
        });

        it("should fail if already locked", (done) => {
            lock(tmpFile, (err) => {
                assert.isNull(err);

                lock(tmpFile, (err) => {
                    assert.instanceOf(err, Error);
                    assert.equal(err.code, "ELOCKED");
                    assert.equal(err.file, tmpFileRealPath);

                    done();
                });
            });
        });

        it("should retry several times if retries were specified", (done) => {
            lock(tmpFile, (err, unlock) => {
                assert.isNull(err);

                setTimeout(unlock, 4000);

                lock(tmpFile, { retries: { retries: 5, maxTimeout: 1000 } }, (err) => {
                    assert.isNull(err);

                    done();
                });
            });
        });

        it("should use the custom fs", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = function (path, callback) {
                customFs.realpath = fs.realpath;
                callback(new Error("foo"));
            };

            lock(tmpFile, { fs: customFs }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, "foo");

                done();
            });
        });

        it("should resolve symlinks by default", (done) => {
            // Create a symlink to the tmp file
            stdFs.symlinkSync(tmpFileRealPath, tmpFileSymlinkRealPath);

            lock(tmpFileSymlink, (err) => {
                assert.isNull(err);

                lock(tmpFile, (err) => {
                    assert.instanceOf(err, Error);
                    assert.equal(err.code, "ELOCKED");

                    lock(`${tmpFile}/../../lock_file/tmp`, (err) => {
                        assert.instanceOf(err, Error);
                        assert.equal(err.code, "ELOCKED");

                        done();
                    });
                });
            });
        });

        it("should not resolve symlinks if realpath is false", (done) => {
            // Create a symlink to the tmp file
            stdFs.symlinkSync(tmpFileRealPath, tmpFileSymlinkRealPath);

            lock(tmpFileSymlink, { realpath: false }, (err) => {
                assert.isNull(err);

                lock(tmpFile, { realpath: false }, (err) => {
                    assert.isNull(err);

                    lock(`${tmpFile}/../../lock_file/tmp`, { realpath: false }, (err) => {
                        assert.instanceOf(err, Error);
                        assert.equal(err.code, "ELOCKED");

                        done();
                    });
                });
            });
        });

        it("should remove and acquire over stale locks", (done) => {
            const mtime = (Date.now() - 60000) / 1000;

            stdFs.mkdirSync(tmpFileLock);
            stdFs.utimesSync(tmpFileLock, mtime, mtime);

            lock(tmpFile, (err) => {
                assert.isNull(err);
                expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(Date.now() - 3000);

                done();
            });
        });

        it.skip("should retry if the lockfile was removed when verifying staleness", (done) => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = function (path, callback) {
                rimraf.sync(tmpFileLock);
                fs.stat(path, callback);
                customFs.stat = fs.stat;
            };

            stdFs.mkdirSync(tmpFileLock);
            stdFs.utimesSync(tmpFileLock, mtime, mtime);

            lock(tmpFile, { fs: customFs }, (err) => {
                assert.isNull(err);
                expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(Date.now() - 3000);

                done();
            });
        });

        it("should retry if the lockfile was removed when verifying staleness (not recursively)", (done) => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = function (path, callback) {
                const err = new Error();

                err.code = "ENOENT";

                return callback(err);
            };

            stdFs.mkdirSync(tmpFileLock);
            stdFs.utimesSync(tmpFileLock, mtime, mtime);

            lock(tmpFile, { fs: customFs }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");

                done();
            });
        });

        it("should fail if stating the lockfile errors out when verifying staleness", (done) => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = function (path, callback) {
                callback(new Error("foo"));
            };

            stdFs.mkdirSync(tmpFileLock);
            stdFs.utimesSync(tmpFileLock, mtime, mtime);

            lock(tmpFile, { fs: customFs }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, "foo");

                done();
            });
        });

        it.skip("should fail if removing a stale lockfile errors out", (done) => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.rmdir = function (path, callback) {
                callback(new Error("foo"));
            };

            stdFs.mkdirSync(tmpFileLock);
            stdFs.utimesSync(tmpFileLock, mtime, mtime);

            lock(tmpFile, { fs: customFs }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, "foo");

                done();
            });
        });

        it("should update the lockfile mtime automatically", (done) => {
            lock(tmpFile, { update: 1000 }, (err) => {
                assert.isNull(err);

                let mtime = fs.statSync(tmpFileLock).mtime;

                // First update occurs at 1000ms
                setTimeout(() => {
                    const stat = fs.statSync(tmpFileLock);

                    expect(stat.mtime.getTime()).to.be.greaterThan(mtime.getTime());
                    mtime = stat.mtime;
                }, 1500);

                // Second update occurs at 2000ms
                setTimeout(() => {
                    const stat = fs.statSync(tmpFileLock);

                    expect(stat.mtime.getTime()).to.be.greaterThan(mtime.getTime());
                    mtime = stat.mtime;

                    done();
                }, 2500);
            });
        });

        it("should set stale to a minimum of 2000", (done) => {
            stdFs.mkdirSync(tmpFileLock);

            setTimeout(() => {
                lock(tmpFile, { stale: 100 }, (err) => {
                    assert.instanceOf(err, Error);
                    assert.equal(err.code, "ELOCKED");
                });
            }, 200);

            setTimeout(() => {
                lock(tmpFile, { stale: 100 }, (err) => {
                    assert.isNull(err);

                    done();
                });
            }, 2200);
        });

        it("should set stale to a minimum of 2000 (falsy)", (done) => {
            stdFs.mkdirSync(tmpFileLock);

            setTimeout(() => {
                lock(tmpFile, { stale: false }, (err) => {
                    assert.instanceOf(err, Error);
                    assert.equal(err.code, "ELOCKED");
                });
            }, 200);

            setTimeout(() => {
                lock(tmpFile, { stale: false }, (err) => {
                    assert.isNull(err);

                    done();
                });
            }, 2200);
        });

        it("should call the compromised function if ENOENT was detected when updating the lockfile mtime", (done) => {
            lock(tmpFile, { update: 1000 }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");
                assert.isTrue(err.message.includes("ENOENT"));

                lock(tmpFile, (err) => {
                    assert.isNull(err);

                    done();
                }, done);
            }, (err) => {
                assert.isNull(err);

                fs.rm(tmpFileLock);
            });
        });

        it("should call the compromised function if failed to update the lockfile mtime too many times", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = function (path, atime, mtime, callback) {
                callback(new Error("foo"));
            };

            lock(tmpFile, { fs: customFs, update: 1000, stale: 5000 }, (err) => {
                assert.instanceOf(err, Error);
                assert.isTrue(err.message.includes("foo"));
                assert.equal(err.code, "ECOMPROMISED");

                done();
            }, (err) => {
                assert.isNull(err);
            });
        });

        it("should call the compromised function if updating the lockfile took too much time", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = function (path, atime, mtime, callback) {
                setTimeout(() => {
                    callback(new Error("foo"));
                }, 6000);
            };

            lock(tmpFile, { fs: customFs, update: 1000, stale: 5000 }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");
                assert.isTrue(err.message.includes("threshold"));
                assert.isTrue(fs.existsSync(tmpFileLock));

                done();
            }, (err) => {
                assert.isNull(err);
            });
        });

        it("should call the compromised function if lock was acquired by someone else due to staleness", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = function (path, atime, mtime, callback) {
                setTimeout(() => {
                    callback(new Error("foo"));
                }, 6000);
            };

            lock(tmpFile, { fs: customFs, update: 1000, stale: 5000 }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");
                assert.isTrue(fs.existsSync(tmpFileLock));

                done();
            }, (err) => {
                assert.isNull(err);

                setTimeout(() => {
                    lock(tmpFile, { stale: 5000 }, (err) => {
                        assert.isNull(err);
                    });
                }, 5500);
            });
        });

        it("should throw an error by default when the lock is compromised", (only) => {
            const originalException = process.listeners("uncaughtException").pop();

            process.removeListener("uncaughtException", originalException);

            process.once("uncaughtException", (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");

                process.nextTick(() => {
                    process.on("uncaughtException", originalException);
                    only();
                });
            });

            lock(tmpFile, { update: 1000 }, (err) => {
                assert.isNull(err);

                fs.rm(tmpFileLock);
            });
        });

        it("should set update to a minimum of 1000", (next) => {
            lock(tmpFile, { update: 100 }, (err) => {
                const mtime = fs.statSync(tmpFileLock).mtime.getTime();

                assert.isNull(err);

                setTimeout(() => {
                    assert.equal(mtime, stdFs.statSync(tmpFileLock).mtime.getTime());
                }, 200);

                setTimeout(() => {
                    expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(mtime);

                    next();
                }, 1200);
            });
        });

        it("should set update to a minimum of 1000 (falsy)", (done) => {
            lock(tmpFile, { update: false }, (err) => {
                const mtime = fs.statSync(tmpFileLock).mtime.getTime();

                assert.isNull(err);

                setTimeout(() => {
                    assert.equal(mtime, fs.statSync(tmpFileLock).mtime.getTime());
                }, 200);

                setTimeout(() => {
                    expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(mtime);

                    done();
                }, 1200);
            });
        });

        it("should set update to a maximum of stale / 2", (done) => {
            lock(tmpFile, { update: 6000, stale: 5000 }, (err) => {
                const mtime = fs.statSync(tmpFileLock).mtime.getTime();

                assert.isNull(err);

                setTimeout(() => {
                    assert.equal(fs.statSync(tmpFileLock).mtime.getTime(), mtime);
                }, 2000);

                setTimeout(() => {
                    expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(mtime);

                    done();
                }, 3000);
            });
        });
    });

    describe("unlock()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            await fs.rm(tmpFileSymlink);
        });

        afterEach(clearLocks);

        it("should fail if the lock is not acquired", (done) => {
            unlock(tmpFile, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ENOTACQUIRED");

                done();
            });
        });

        it("should release the lock", (done) => {
            lock(tmpFile, (err) => {
                assert.isNull(err);

                unlock(tmpFile, (err) => {
                    assert.isNull(err);

                    lock(tmpFile, (err) => {
                        assert.isNull(err);

                        done();
                    });
                });
            });
        });

        it("should release the lock (without callback)", (next) => {
            lock(tmpFile, (err) => {
                assert.isNull(err);

                unlock(tmpFile);

                setTimeout(() => {
                    lock(tmpFile, (err) => {
                        assert.isNull(err);

                        next();
                    });
                }, 2000);
            });
        });

        it("should remove the lockfile", (done) => {
            lock(tmpFile, (err) => {
                assert.isNull(err);
                assert.isTrue(fs.existsSync(tmpFileLock));

                unlock(tmpFile, (err) => {
                    assert.isNull(err);
                    assert.isFalse(fs.existsSync(tmpFileLock));

                    done();
                });
            });
        });

        it("should fail if removing the lockfile errors out", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.rmdir = function (path, callback) {
                callback(new Error("foo"));
            };

            lock(tmpFile, (err) => {
                assert.isNull(err);

                unlock(tmpFile, { fs: customFs }, (err) => {
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, "foo");

                    done();
                });
            });
        });

        it.skip("should ignore ENOENT errors when removing the lockfile", (done) => {
            const customFs = Object.assign({}, fs);
            let called;

            customFs.rmdir = function (path, callback) {
                called = true;
                rimraf.sync(path);
                fs.rmdir(path, callback);
            };

            lock(tmpFile, (err) => {
                assert.isNull(err);

                unlock(tmpFile, { fs: customFs }, (err) => {
                    assert.isNull(err);
                    assert.isTrue(called);

                    done();
                });
            });
        });

        it("should stop updating the lockfile mtime", (done) => {
            lock(tmpFile, { update: 2000 }, (err) => {
                assert.isNull(err);

                unlock(tmpFile, (err) => {
                    assert.isNull(err);

                    // First update occurs at 2000ms
                    setTimeout(done, 2500);
                });
            });
        });

        it("should stop updating the lockfile mtime (slow fs)", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = function (path, atime, mtime, callback) {
                setTimeout(stdFs.utimes.bind(fs, path, atime, mtime, callback), 2000);
            };

            lock(tmpFile, { fs: customFs, update: 2000 }, (err) => {
                assert.isNull(err);

                setTimeout(() => {
                    unlock(tmpFile, (err) => {
                        assert.isNull(err);
                    });
                }, 3000);

                setTimeout(done, 6000);
            });
        });

        it("should stop updating the lockfile mtime (slow fs + new lock)", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = function (path, atime, mtime, callback) {
                setTimeout(stdFs.utimes.bind(fs, path, atime, mtime, callback), 2000);
            };

            lock(tmpFile, { fs: customFs, update: 2000 }, (err) => {
                assert.isNull(err);

                setTimeout(() => {
                    unlock(tmpFile, (err) => {
                        assert.isNull(err);

                        lock(tmpFile, (err) => {
                            assert.isNull(err);
                        });
                    });
                }, 3000);

                setTimeout(done, 6000);
            });
        });

        it("should resolve to a canonical path", (done) => {
            // Create a symlink to the tmp file
            stdFs.symlinkSync(tmpFileRealPath, tmpFileSymlinkRealPath);

            lock(tmpFile, (err) => {
                assert.isNull(err);

                unlock(tmpFile, (err) => {
                    assert.isNull(err);
                    assert.isFalse(stdFs.existsSync(tmpFileLock));

                    done();
                });
            });
        });

        it("should use the custom fs", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = function (path, callback) {
                customFs.realpath = fs.realpath;
                callback(new Error("foo"));
            };

            unlock(tmpFile, { fs: customFs }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, "foo");

                done();
            });
        });
    });

    describe("checkLock()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            await fs.rm(tmpFileSymlink);
        });

        afterEach(clearLocks);

        it("should fail if the file does not exist by default", (done) => {
            checkLock(tmpNonExistentFile, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ENOENT");

                done();
            });
        });

        it("should not fail if the file does not exist and realpath is false", (done) => {
            checkLock(tmpNonExistentFile, { realpath: false }, (err) => {
                assert.isNull(err);

                done();
            });
        });

        it("should callback with true if file is locked", (next) => {
            lock(tmpFile, (err) => {
                assert.isNull(err);

                checkLock(tmpFile, (err, locked) => {
                    assert.isNull(err);
                    assert.isTrue(locked);
                    next();
                });
            });
        });

        it("should callback with false if file is not locked", (done) => {
            checkLock(tmpFile, (err, locked) => {
                assert.isNull(err);
                assert.isFalse(locked);
                done();
            });
        });

        it("should use the custom fs", (done) => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = function (path, callback) {
                customFs.realpath = fs.realpath;
                callback(new Error("foo"));
            };

            checkLock(tmpFile, { fs: customFs }, (err, locked) => {
                assert.instanceOf(err, Error);
                assert.isUndefined(locked);

                done();
            });
        });

        it("should resolve symlinks by default", (next) => {
            // Create a symlink to the tmp file
            stdFs.symlinkSync(tmpFileRealPath, tmpFileSymlinkRealPath);

            lock(tmpFileSymlink, (err) => {
                assert.isNull(err);

                checkLock(tmpFile, (err, locked) => {
                    assert.isNull(err);
                    assert.isTrue(locked);

                    checkLock(`${tmpFile}/../../lock_file/tmp`, (err, locked) => {
                        assert.isNull(err);
                        assert.isTrue(locked);
                        next();
                    });
                });
            });
        });

        it("should not resolve symlinks if realpath is false", (next) => {
            // Create a symlink to the tmp file
            stdFs.symlinkSync(tmpFileRealPath, tmpFileSymlinkRealPath);

            lock(tmpFileSymlink, { realpath: false }, (err) => {
                assert.isNull(err);

                checkLock(tmpFile, { realpath: false }, (err, locked) => {
                    assert.isNull(err);
                    assert.isFalse(locked);

                    checkLock(`${tmpFile}/../../lock_file/tmp`, { realpath: false }, (err, locked) => {
                        assert.isNull(err);
                        assert.isFalse(locked);

                        next();
                    });
                });
            });
        });

        it("should fail if stating the lockfile errors out when verifying staleness", (next) => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = function (path, callback) {
                callback(new Error("foo"));
            };

            stdFs.mkdirSync(tmpFileLock);
            stdFs.utimesSync(tmpFileLock, mtime, mtime);

            checkLock(tmpFile, { fs: customFs }, (err, locked) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, "foo");
                assert.isUndefined(locked);

                next();
            });
        });

        it("should set stale to a minimum of 2000", (next) => {
            stdFs.mkdirSync(tmpFileLock);

            setTimeout(() => {
                lock(tmpFile, { stale: 2000 }, (err) => {
                    assert.instanceOf(err, Error);
                    assert.equal(err.code, "ELOCKED");
                });
            }, 200);

            setTimeout(() => {
                checkLock(tmpFile, { stale: 100 }, (err, locked) => {
                    assert.isNull(err);
                    assert.isFalse(locked);

                    next();
                });
            }, 2200);
        });

        it("should set stale to a minimum of 2000 (falsy)", (next) => {
            stdFs.mkdirSync(tmpFileLock);

            setTimeout(() => {
                lock(tmpFile, { stale: 2000 }, (err) => {
                    assert.instanceOf(err, Error);
                    assert.equal(err.code, "ELOCKED");
                });
            }, 200);

            setTimeout(() => {
                checkLock(tmpFile, { stale: false }, (err, locked) => {
                    assert.isNull(err);
                    assert.isFalse(locked);

                    next();
                });
            }, 2200);
        });
    });

    describe("release()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
        });

        afterEach(clearLocks);

        it("should release the lock after calling the provided release function", (next) => {
            lock(tmpFile, (err, release) => {
                assert.isNull(err);

                release((err) => {
                    assert.isNull(err);

                    lock(tmpFile, (err) => {
                        assert.isNull(err);

                        next();
                    });
                });
            });
        });

        it("should fail when releasing twice", (next) => {
            lock(tmpFile, (err, release) => {
                assert.isNull(err);

                release((err) => {
                    assert.isNull(err);

                    release((err) => {
                        assert.instanceOf(err, Error);
                        assert.equal(err.code, "ERELEASED");

                        next();
                    });
                });
            });
        });
    });


    describe.skip("misc", () => {
        afterEach(clearLocks);

        it("should remove open locks if the process crashes", (next) => {
            cp.exec(`node ${__dirname}/crash.js`, (err, stdout, stderr) => {
                if (!err) {
                    return next(new Error("Should have failed"));
                }

                if (err.code === 25) {
                    adone.log("gfdgd");
                    return next(new Error("Lock failed"));
                }

                adone.log(stderr);
                assert.isTrue(stderr.includes("crash"));
                assert.isFalse(stdFs.existsSync(tmpFileLock));

                next();
            });
        });

        it("should not hold the process if it has no more work to do", (next) => {
            cp.spawn("node", [`${__dirname}/unref.js`], next);
        });

        it("should work on stress conditions", function (next) {
            this.timeout(80000);

            cp.spawn("node", [`${__dirname}/fixtures/stress.js`], (err, stdout) => {
                if (err) {
                    stdout = stdout || "";

                    if (process.env.TRAVIS) {
                        process.stdout.write(stdout);
                    } else {
                        stdFs.writeFileSync(`${__dirname}/stress.log`, stdout);
                    }

                    return next(err);
                }

                next();
            });
        });
    });
});
