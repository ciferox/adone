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

    const clearLocks = async () => {
        const files = [
            {
                file: tmpFile,
                realpath: false
            },
            {
                file: tmpNonExistentFile,
                realpath: false
            },
            {
                file: tmpFileSymlink,
                realpath: false
            }
        ];

        if (await fs.exists(tmpFileSymlink)) {
            files.push({
                file: tmpFileSymlink,
                realpath: true
            });
        }

        for (const f of files) {
            try {
                // eslint-disable-next-line
                await unlock(f.file, {
                    realpath: f.realpath
                });
            } catch (err) {
                if (err.code !== "ENOTACQUIRED") {
                    throw err;
                }
            }
        }

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

        it("should fail if the file does not exist by default", async () => {
            const err = await assert.throws(async () => lock(tmpNonExistentFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOENT");
        });

        it("should not fail if the file does not exist and realpath is false", async () => {
            await lock(tmpNonExistentFile, { realpath: false });
        });

        it("should fail if impossible to create the lockfile", async () => {
            const err = await assert.throws(async () => lock("nonexistentdir/nonexistentfile", { realpath: false }));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOENT");
        });

        it("should create the lockfile", async () => {
            await lock(tmpFile);
            assert.isTrue(fs.existsSync(tmpFileLock));
        });

        it("should fail if already locked", async () => {
            await lock(tmpFile);
            const err = await assert.throws(async () => lock(tmpFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");
            assert.equal(err.file, tmpFileRealPath);
        });

        it("should retry several times if retries were specified", async () => {
            const unlock = await lock(tmpFile);

            setTimeout(unlock, 4000);

            await lock(tmpFile, {
                retries: {
                    retries: 5,
                    maxTimeout: 1000
                }
            });
        });

        it("should use the custom fs", async () => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = async (path) => {
                customFs.realpath = fs.realpath;
                throw new Error("foo");
            };

            const err = await assert.throws(async () => lock(tmpFile, {
                fs: customFs
            }));

            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should resolve symlinks by default", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lock(tmpFileSymlink);
            let err = await assert.throws(async () => lock(tmpFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");

            err = await assert.throws(async () => lock(`${tmpFile}/../../lock_file/tmp`));

            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");
        });

        it("should not resolve symlinks if realpath is false", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lock(tmpFileSymlink, {
                realpath: false
            });

            await lock(tmpFile, {
                realpath: false
            });

            const err = await assert.throws(async () => lock(`${tmpFile}/../../lock_file/tmp`, {
                realpath: false
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");
        });

        it("should remove and acquire over stale locks", async () => {
            const mtime = (Date.now() - 60000) / 1000;

            await fs.mkdir(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            await lock(tmpFile);
            expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(Date.now() - 3000);
        });

        it("should retry if the lockfile was removed when verifying staleness", async () => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = async (path, callback) => {
                await fs.rm(tmpFileLock);
                const result = await fs.stat(path, callback);
                customFs.stat = fs.stat;
                return result;
            };

            await fs.mkdir(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            await lock(tmpFile, {
                fs: customFs
            });

            expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(Date.now() - 3000);
        });

        it("should retry if the lockfile was removed when verifying staleness (not recursively)", async () => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = async (path) => {
                const err = new Error();
                err.code = "ENOENT";
                throw err;
            };

            await fs.mkdir(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await assert.throws(async () => lock(tmpFile, {
                fs: customFs
            }));

            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");
        });

        it("should fail if stating the lockfile errors out when verifying staleness", async () => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = (path) => {
                throw new Error("foo");
            };

            await fs.mkdir(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await assert.throws(async () => lock(tmpFile, {
                fs: customFs
            }));

            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should fail if removing a stale lockfile errors out", async () => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.rm = (path) => {
                throw new Error("foo");
            };

            await fs.mkdir(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await await assert.throws(async () => lock(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should update the lockfile mtime automatically", async (done) => {
            await lock(tmpFile, {
                update: 1000
            });

            let mtime = (await fs.stat(tmpFileLock)).mtime;

            // First update occurs at 1000ms
            setTimeout(() => {
                const stat = stdFs.statSync(tmpFileLock);

                expect(stat.mtime.getTime()).to.be.greaterThan(mtime.getTime());
                mtime = stat.mtime;
            }, 1500);

            // Second update occurs at 2000ms
            setTimeout(() => {
                const stat = stdFs.statSync(tmpFileLock);

                expect(stat.mtime.getTime()).to.be.greaterThan(mtime.getTime());
                mtime = stat.mtime;

                done();
            }, 2500);
        });

        it("should set stale to a minimum of 2000", async (done) => {
            await fs.mkdir(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lock(tmpFile, {
                    stale: 100
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                await lock(tmpFile, {
                    stale: 100
                });
                done();
            }, 2200);
        });

        it("should set stale to a minimum of 2000 (falsy)", async (done) => {
            await fs.mkdir(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lock(tmpFile, {
                    stale: false
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                await lock(tmpFile, {
                    stale: false
                });
                done();
            }, 2200);
        });

        it("should call the compromised function if ENOENT was detected when updating the lockfile mtime", async (done) => {
            await lock(tmpFile, {
                update: 1000
            }, async (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");
                assert.isTrue(err.message.includes("ENOENT"));

                await lock(tmpFile);
                done();
            });
            await fs.rm(tmpFileLock);
        });

        it("should call the compromised function if failed to update the lockfile mtime too many times", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime) => {
                throw new Error("foo");
            };

            await lock(tmpFile, {
                fs: customFs,
                update: 1000,
                stale: 5000
            }, (err) => {
                assert.instanceOf(err, Error);
                assert.isTrue(err.message.includes("foo"));
                assert.equal(err.code, "ECOMPROMISED");

                done();
            });
        });

        it("should call the compromised function if updating the lockfile took too much time", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime) => {
                await adone.promise.delay(6000);
                throw new Error("foo");
            };

            await lock(tmpFile, {
                fs: customFs,
                update: 1000,
                stale: 5000
            }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");
                assert.isTrue(err.message.includes("threshold"));
                assert.isTrue(fs.existsSync(tmpFileLock));

                done();
            });
        });

        it("should call the compromised function if lock was acquired by someone else due to staleness", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime, ) => {
                await adone.promise.delay(6000);
                throw new Error("foo");
            };

            await lock(tmpFile, {
                fs: customFs,
                update: 1000,
                stale: 5000
            }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");
                assert.isTrue(fs.existsSync(tmpFileLock));

                done();
            });

            await adone.promise.delay(5500);
            await lock(tmpFile, {
                stale: 5000
            });
        });

        it.skip("should throw an error by default when the lock is compromised", async (done) => {
            const originalException = process.listeners("uncaughtException").pop();

            process.removeListener("uncaughtException", originalException);

            process.once("uncaughtException", (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");

                process.nextTick(() => {
                    process.on("uncaughtException", originalException);
                    done();
                });
            });

            await lock(tmpFile, {
                update: 1000
            });

            await fs.rm(tmpFileLock);
        });

        it("should set update to a minimum of 1000", async (done) => {
            await lock(tmpFile, { update: 100 });
            const mtime = stdFs.statSync(tmpFileLock).mtime.getTime();

            setTimeout(() => {
                assert.equal(mtime, stdFs.statSync(tmpFileLock).mtime.getTime());
            }, 200);

            setTimeout(() => {
                expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(mtime);

                done();
            }, 1200);
        });

        it("should set update to a minimum of 1000 (falsy)", async (done) => {
            await lock(tmpFile, {
                update: false
            });
            const mtime = stdFs.statSync(tmpFileLock).mtime.getTime();

            setTimeout(() => {
                assert.equal(mtime, fs.statSync(tmpFileLock).mtime.getTime());
            }, 200);

            setTimeout(() => {
                expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(mtime);

                done();
            }, 1200);
        });

        it("should set update to a maximum of stale / 2", async (done) => {
            await lock(tmpFile, {
                update: 6000,
                stale: 5000
            });
            const mtime = stdFs.statSync(tmpFileLock).mtime.getTime();

            setTimeout(() => {
                assert.equal(fs.statSync(tmpFileLock).mtime.getTime(), mtime);
            }, 2000);

            setTimeout(() => {
                expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(mtime);

                done();
            }, 3000);
        });
    });

    describe("unlock()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            await fs.rm(tmpFileSymlink);
        });

        afterEach(clearLocks);

        it("should fail if the lock is not acquired", async () => {
            const err = await assert.throws(async () => unlock(tmpFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOTACQUIRED");
        });

        it("should release the lock", async () => {
            await lock(tmpFile);
            await unlock(tmpFile);
            await lock(tmpFile);
        });

        it("should release the lock (without callback)", async (done) => {
            await lock(tmpFile);
            await unlock(tmpFile);

            setTimeout(async () => {
                await lock(tmpFile);
                done();
            }, 2000);
        });

        it("should remove the lockfile", async () => {
            await lock(tmpFile);
            assert.isTrue(fs.existsSync(tmpFileLock));

            await unlock(tmpFile);
            assert.isFalse(fs.existsSync(tmpFileLock));
        });

        it("should fail if removing the lockfile errors out", async () => {
            const customFs = Object.assign({}, fs);

            customFs.rm = (path) => {
                throw new Error("foo");
            };

            await lock(tmpFile);
            const err = await assert.throws(async () => unlock(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should ignore ENOENT errors when removing the lockfile", async () => {
            const customFs = Object.assign({}, fs);
            let called = false;

            customFs.rm = async (path) => {
                called = true;
                await fs.rm(path);
            };

            await lock(tmpFile);
            await unlock(tmpFile, {
                fs: customFs
            });
            assert.isTrue(called);
        });

        it("should stop updating the lockfile mtime", async (done) => {
            await lock(tmpFile, {
                update: 2000
            });

            await unlock(tmpFile);
            // First update occurs at 2000ms
            setTimeout(done, 2500);
        });

        it("should stop updating the lockfile mtime (slow fs)", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime) => {
                await adone.promise.delay(2000);
                await fs.utimes(path, atime, mtime);
            };

            await lock(tmpFile, {
                fs: customFs,
                update: 2000
            });

            setTimeout(async () => {
                await unlock(tmpFile);
            }, 3000);

            setTimeout(done, 6000);
        });

        it("should stop updating the lockfile mtime (slow fs + new lock)", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime) => {
                await adone.promise.delay(2000);
                await fs.utimes(path, atime, mtime);
            };

            await lock(tmpFile, {
                fs: customFs,
                update: 2000
            });

            setTimeout(async () => {
                await unlock(tmpFile);
                await lock(tmpFile);
            }, 3000);

            setTimeout(done, 6000);
        });

        it("should resolve to a canonical path", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lock(tmpFile);
            await unlock(tmpFile);
            assert.isFalse(stdFs.existsSync(tmpFileLock));
        });

        it("should use the custom fs", async () => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = async (path, callback) => {
                customFs.realpath = fs.realpath;
                throw new Error("foo");
            };

            const err = await assert.throws(async () => unlock(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });
    });

    describe("checkLock()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            await fs.rm(tmpFileSymlink);
        });

        afterEach(clearLocks);

        it("should fail if the file does not exist by default", async () => {
            const err = await assert.throws(async () => checkLock(tmpNonExistentFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOENT");
        });

        it("should not fail if the file does not exist and realpath is false", async () => {
            await checkLock(tmpNonExistentFile, {
                realpath: false
            });
        });

        it("should callback with true if file is locked", async () => {
            await lock(tmpFile);
            const locked = await checkLock(tmpFile);
            assert.isTrue(locked);
        });

        it("should callback with false if file is not locked", async () => {
            const locked = await checkLock(tmpFile);
            assert.isFalse(locked);
        });

        it("should use the custom fs", async () => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = async (path) => {
                customFs.realpath = fs.realpath;
                throw new Error("foo");
            };

            const err = await assert.throws(async () => checkLock(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
        });

        it("should resolve symlinks by default", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lock(tmpFileSymlink);
            let locked = await checkLock(tmpFile);
            assert.isTrue(locked);

            locked = await checkLock(`${tmpFile}/../../lock_file/tmp`);
            assert.isTrue(locked);
        });

        it("should not resolve symlinks if realpath is false", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lock(tmpFileSymlink, {
                realpath: false
            });

            let locked = await checkLock(tmpFile, {
                realpath: false
            });
            assert.isFalse(locked);

            locked = await checkLock(`${tmpFile}/../../lock_file/tmp`, {
                realpath: false
            });
            assert.isFalse(locked);
        });

        it("should fail if stating the lockfile errors out when verifying staleness", async () => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = async (path) => {
                throw new Error("foo");
            };

            await fs.mkdir(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await assert.throws(async () => checkLock(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should set stale to a minimum of 2000", async (done) => {
            await fs.mkdir(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lock(tmpFile, {
                    stale: 2000
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                const locked = await checkLock(tmpFile, { stale: 100 });
                assert.isFalse(locked);
                done();
            }, 2200);
        });

        it("should set stale to a minimum of 2000 (falsy)", async (done) => {
            await fs.mkdir(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lock(tmpFile, {
                    stale: 2000
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                const locked = await checkLock(tmpFile, { stale: false });
                assert.isFalse(locked);
                done();
            }, 2200);
        });
    });

    describe("release()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
        });

        afterEach(clearLocks);

        it("should release the lock after calling the provided release function", async () => {
            const release = await lock(tmpFile);
            await release();
            await lock(tmpFile);
        });

        it("should fail when releasing twice", async () => {
            const release = await lock(tmpFile);
            await release();
            const err = await assert.throws(async () => release());
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ERELEASED");
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
