const {
    app: { lockfile },
    fs,
    std: { path, fs: stdFs }
} = adone;

describe("lock file", () => {
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
                await lockfile.release(f.file, {
                    realpath: f.realpath
                });
            } catch (err) {
                if (err.code !== "ENOTACQUIRED") {
                    throw err;
                }
            }
        }

        await fs.remove(tmpFile);
        await fs.remove(tmpFileLock);
        await fs.remove(tmpFileSymlink);
        await fs.remove(tmpFileSymlinkLock);
    };

    describe("create()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            try {
                await fs.remove(tmpFileSymlink);
            } catch (err) { }
        });

        afterEach(clearLocks);

        it("should fail if the file does not exist by default", async () => {
            const err = await assert.throws(async () => lockfile.create(tmpNonExistentFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOENT");
        });

        it("should not fail if the file does not exist and realpath is false", async () => {
            await lockfile.create(tmpNonExistentFile, { realpath: false });
        });

        it("should fail if impossible to create the lockfile", async () => {
            const err = await assert.throws(async () => lockfile.create("nonexistentdir/nonexistentfile", { realpath: false }));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOENT");
        });

        it("should create the lockfile", async () => {
            await lockfile.create(tmpFile);
            assert.isTrue(fs.existsSync(tmpFileLock));
        });

        it("should create the lockfile inside a folder", async () => {
            const lockPath = path.join(__dirname, "tmp1");

            try {
                await fs.mkdir(lockPath);
            } catch (err) {
                await fs.remove(lockPath);
                await fs.mkdir(lockPath);
            }
            const lockfilePath = adone.path.join(lockPath, "dir.lock");

            const options = {
                lockfilePath
            };
            await lockfile.create(lockPath, options);

            assert.isTrue(await fs.isDirectory(lockPath));
            assert.isTrue(await fs.exists(lockfilePath));
            lockfile.release(lockPath, options);

            await fs.remove(lockPath);
        });

        it("should fail if already locked", async () => {
            await lockfile.create(tmpFile);
            const err = await assert.throws(async () => lockfile.create(tmpFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");
            assert.equal(err.file, tmpFileRealPath);
        });

        it("should retry several times if retries were specified", async () => {
            const release = await lockfile.create(tmpFile);

            setTimeout(release, 4000);

            await lockfile.create(tmpFile, {
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

            const err = await assert.throws(async () => lockfile.create(tmpFile, {
                fs: customFs
            }));

            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should resolve symlinks by default", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lockfile.create(tmpFileSymlink);
            let err = await assert.throws(async () => lockfile.create(tmpFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");

            err = await assert.throws(async () => lockfile.create(`${tmpFile}/../../lockfile/tmp`));

            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");
        });

        it("should not resolve symlinks if realpath is false", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lockfile.create(tmpFileSymlink, {
                realpath: false
            });

            await lockfile.create(tmpFile, {
                realpath: false
            });

            const err = await assert.throws(async () => lockfile.create(`${tmpFile}/../../lockfile/tmp`, {
                realpath: false
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ELOCKED");
        });

        it("should remove and acquire over stale locks", async () => {
            const mtime = (Date.now() - 60000) / 1000;

            await fs.mkdirp(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            await lockfile.create(tmpFile);
            expect(fs.statSync(tmpFileLock).mtime.getTime()).to.be.greaterThan(Date.now() - 3000);
        });

        it("should retry if the lockfile was removed when verifying staleness", async () => {
            const mtime = (Date.now() - 60000) / 1000;
            const customFs = Object.assign({}, fs);

            customFs.stat = async (path, callback) => {
                await fs.remove(tmpFileLock);
                const result = await fs.stat(path, callback);
                customFs.stat = fs.stat;
                return result;
            };

            await fs.mkdirp(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            await lockfile.create(tmpFile, {
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

            await fs.mkdirp(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await assert.throws(async () => lockfile.create(tmpFile, {
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

            await fs.mkdirp(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await assert.throws(async () => lockfile.create(tmpFile, {
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

            await fs.mkdirp(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await await assert.throws(async () => lockfile.create(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should update the lockfile mtime automatically", async (done) => {
            await lockfile.create(tmpFile, {
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
            await fs.mkdirp(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lockfile.create(tmpFile, {
                    stale: 100
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                await lockfile.create(tmpFile, {
                    stale: 100
                });
                done();
            }, 2200);
        });

        it("should set stale to a minimum of 2000 (falsy)", async (done) => {
            await fs.mkdirp(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lockfile.create(tmpFile, {
                    stale: false
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                await lockfile.create(tmpFile, {
                    stale: false
                });
                done();
            }, 2200);
        });

        it("should call the compromised function if ENOENT was detected when updating the lockfile mtime", async (done) => {
            await lockfile.create(tmpFile, {
                update: 1000
            }, async (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ECOMPROMISED");
                assert.isTrue(err.message.includes("ENOENT"));

                await lockfile.create(tmpFile);
                done();
            });
            await fs.remove(tmpFileLock);
        });

        it("should call the compromised function if failed to update the lockfile mtime too many times", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime) => {
                throw new Error("foo");
            };

            await lockfile.create(tmpFile, {
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

            await lockfile.create(tmpFile, {
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

            await lockfile.create(tmpFile, {
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
            await lockfile.create(tmpFile, {
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

            await lockfile.create(tmpFile, {
                update: 1000
            });

            await fs.remove(tmpFileLock);
        });

        it("should set update to a minimum of 1000", async (done) => {
            await lockfile.create(tmpFile, { update: 100 });
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
            await lockfile.create(tmpFile, {
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
            await lockfile.create(tmpFile, {
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

    describe("release()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            await fs.remove(tmpFileSymlink);
        });

        afterEach(clearLocks);

        it("should fail if the lock is not acquired", async () => {
            const err = await assert.throws(async () => lockfile.release(tmpFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOTACQUIRED");
        });

        it("should release the lock", async () => {
            await lockfile.create(tmpFile);
            await lockfile.release(tmpFile);
            await lockfile.create(tmpFile);
        });

        it("should release the lock (without callback)", async (done) => {
            await lockfile.create(tmpFile);
            await lockfile.release(tmpFile);

            setTimeout(async () => {
                await lockfile.create(tmpFile);
                done();
            }, 2000);
        });

        it("should remove the lockfile", async () => {
            await lockfile.create(tmpFile);
            assert.isTrue(fs.existsSync(tmpFileLock));

            await lockfile.release(tmpFile);
            assert.isFalse(fs.existsSync(tmpFileLock));
        });

        it("should fail if removing the lockfile errors out", async () => {
            const customFs = Object.assign({}, fs);

            customFs.rm = (path) => {
                throw new Error("foo");
            };

            await lockfile.create(tmpFile);
            const err = await assert.throws(async () => lockfile.release(tmpFile, {
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
                await fs.remove(path);
            };

            await lockfile.create(tmpFile);
            await lockfile.release(tmpFile, {
                fs: customFs
            });
            assert.isTrue(called);
        });

        it("should stop updating the lockfile mtime", async (done) => {
            await lockfile.create(tmpFile, {
                update: 2000
            });

            await lockfile.release(tmpFile);
            // First update occurs at 2000ms
            setTimeout(done, 2500);
        });

        it("should stop updating the lockfile mtime (slow fs)", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime) => {
                await adone.promise.delay(2000);
                await fs.utimes(path, atime, mtime);
            };

            await lockfile.create(tmpFile, {
                fs: customFs,
                update: 2000
            });

            setTimeout(async () => {
                await lockfile.release(tmpFile);
            }, 3000);

            setTimeout(done, 6000);
        });

        it("should stop updating the lockfile mtime (slow fs + new lock)", async (done) => {
            const customFs = Object.assign({}, fs);

            customFs.utimes = async (path, atime, mtime) => {
                await adone.promise.delay(2000);
                await fs.utimes(path, atime, mtime);
            };

            await lockfile.create(tmpFile, {
                fs: customFs,
                update: 2000
            });

            setTimeout(async () => {
                await lockfile.release(tmpFile);
                await lockfile.create(tmpFile);
            }, 3000);

            setTimeout(done, 6000);
        });

        it("should resolve to a canonical path", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lockfile.create(tmpFile);
            await lockfile.release(tmpFile);
            assert.isFalse(stdFs.existsSync(tmpFileLock));
        });

        it("should use the custom fs", async () => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = async (path) => {
                customFs.realpath = fs.realpath;
                throw new Error("foo");
            };

            const err = await assert.throws(async () => lockfile.release(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });
    });

    describe("check()", () => {
        beforeEach(async () => {
            await fs.writeFile(tmpFile, "");
            await fs.remove(tmpFileSymlink);
        });

        afterEach(clearLocks);

        it("should fail if the file does not exist by default", async () => {
            const err = await assert.throws(async () => lockfile.check(tmpNonExistentFile));
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ENOENT");
        });

        it("should not fail if the file does not exist and realpath is false", async () => {
            await lockfile.check(tmpNonExistentFile, {
                realpath: false
            });
        });

        it("should callback with true if file is locked", async () => {
            await lockfile.create(tmpFile);
            const locked = await lockfile.check(tmpFile);
            assert.isTrue(locked);
        });

        it("should callback with false if file is not locked", async () => {
            const locked = await lockfile.check(tmpFile);
            assert.isFalse(locked);
        });

        it("should use the custom fs", async () => {
            const customFs = Object.assign({}, fs);

            customFs.realpath = async (path) => {
                customFs.realpath = fs.realpath;
                throw new Error("foo");
            };

            const err = await assert.throws(async () => lockfile.check(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
        });

        it("should resolve symlinks by default", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lockfile.create(tmpFileSymlink);
            let locked = await lockfile.check(tmpFile);
            assert.isTrue(locked);

            locked = await lockfile.check(`${tmpFile}/../../lockfile/tmp`);
            assert.isTrue(locked);
        });

        it("should not resolve symlinks if realpath is false", async () => {
            // Create a symlink to the tmp file
            await fs.symlink(tmpFileRealPath, tmpFileSymlinkRealPath);

            await lockfile.create(tmpFileSymlink, {
                realpath: false
            });

            let locked = await lockfile.check(tmpFile, {
                realpath: false
            });
            assert.isFalse(locked);

            locked = await lockfile.check(`${tmpFile}/../../lockfile/tmp`, {
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

            await fs.mkdirp(tmpFileLock);
            await fs.utimes(tmpFileLock, mtime, mtime);

            const err = await assert.throws(async () => lockfile.check(tmpFile, {
                fs: customFs
            }));
            assert.instanceOf(err, Error);
            assert.equal(err.message, "foo");
        });

        it("should set stale to a minimum of 2000", async (done) => {
            await fs.mkdirp(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lockfile.create(tmpFile, {
                    stale: 2000
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                const locked = await lockfile.check(tmpFile, { stale: 100 });
                assert.isFalse(locked);
                done();
            }, 2200);
        });

        it("should set stale to a minimum of 2000 (falsy)", async (done) => {
            await fs.mkdirp(tmpFileLock);

            setTimeout(async () => {
                const err = await assert.throws(async () => lockfile.create(tmpFile, {
                    stale: 2000
                }));
                assert.instanceOf(err, Error);
                assert.equal(err.code, "ELOCKED");
            }, 200);

            setTimeout(async () => {
                const locked = await lockfile.check(tmpFile, { stale: false });
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
            const release = await lockfile.create(tmpFile);
            await release();
            await lockfile.create(tmpFile);
        });

        it("should fail when releasing twice", async () => {
            const release = await lockfile.create(tmpFile);
            await release();
            const err = await assert.throws(async () => release());
            assert.instanceOf(err, Error);
            assert.equal(err.code, "ERELEASED");
        });
    });


    describe("misc", () => {
        afterEach(clearLocks);

        it("should remove open locks if the process crashes", async () => {
            const err = await assert.throws(async () => forkProcess("crash.js"));
            if (err.code === 25) {
                throw new Error("Lock failed");
            }

            assert.isTrue(err.stderr.includes("Error: crashed"));
            assert.isFalse(await fs.exists(tmpFileLock));
        });

        it("should not hold the process if it has no more work to do", async () => {
            await forkProcess("unref.js");
        });

        // it.skip("should work on stress conditions", async function (next) {
        //     this.timeout(80000);

        //     const result = await forkProcess("stress.js");
        //     if (err) {
        //         stdout = stdout || "";

        //         if (process.env.TRAVIS) {
        //             process.stdout.write(stdout);
        //         } else {
        //             stdFs.writeFileSync(`${__dirname}/stress.log`, stdout);
        //         }

        //         return next(err);
        //     }

        //     next();
        // });
    });
});
