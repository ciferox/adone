const realFs = adone.std.fs;
const fs$close = realFs.close;
const fs$closeSync = realFs.closeSync;

describe("fs", "base", () => {
    it("chown-er-ok", (done) => {
        const methods = ["chown", "chownSync", "chmod", "chmodSync"];

        const makeErr = (path, method) => {
            const err = new Error("this is fine");
            err.syscall = method.replace(/Sync$/, "");
            err.code = path.toUpperCase();
            return err;
        };

        const causeErr = (method, original) => {
            realFs[method] = function (path) {
                const err = makeErr(path, method);
                if (!/Sync$/.test(method)) {
                    const cb = arguments[arguments.length - 1];
                    process.nextTick(cb.bind(null, err));
                } else {
                    throw err;
                }
            };
        };

        methods.forEach((method) => {
            causeErr(method, realFs[method]);
        });

        const errs = ["ENOSYS", "EINVAL", "EPERM"];
        expect(errs.length * methods.length).checks(done);

        errs.forEach((err) => {
            methods.forEach((method) => {
                const args = [err];
                if (/chmod/.test(method)) {
                    args.push("some mode");
                } else {
                    args.push("some uid", "some gid");
                }

                if (method.match(/Sync$/)) {
                    adone.fs.base[method].apply(adone.fs.base, args);
                    expect(true).to.be.ok.mark();
                } else {
                    args.push((err) => {
                        expect(err).to.be.exist.mark();
                    });
                    adone.fs.base[method].apply(adone.fs.base, args);
                }
            });
        });
    });

    describe("enoent", () => {
        // this test makes sure that various things get enoent, instead of
        // some other kind of throw.

        const file = "this file does not exist even a little bit";
        const methods = [
            ["open", "r"],
            ["readFile"],
            ["stat"],
            ["lstat"],
            ["utimes", new Date(), new Date()],
            ["readdir"],
            ["readdir", {}],
            ["stat", {}],
            ["lstat", {}]
        ];

        const verify = (done) => {
            return (er) => {
                assert.instanceOf(er, Error);
                assert.equal(er.code, "ENOENT");
                done();
            };
        };

        const runTest = function (args) {
            return (done) => {
                const method = args.shift();
                args.unshift(file);
                const methodSync = `${method}Sync`;
                assert.isTrue(typeof adone.fs.base[methodSync] === "function");
                const err = assert.throws(() => {
                    adone.fs.base[methodSync].apply(adone.fs.base, args);
                });
                assert.equal(err.code, "ENOENT");
                // add the callback
                args.push(verify(done));
                assert.isTrue(typeof adone.fs.base[method] === "function");
                adone.fs.base[method].apply(adone.fs.base, args);
            };
        };

        methods.forEach((method) => {
            it(method[0], runTest(method));
        });
    });

    describe("close", () => {
        it("`close` is patched correctly", () => {

            // assert.notEqual(adone.fs.base.close, fs$close, "patch close");
            // assert.notEqual(adone.fs.base.closeSync, fs$closeSync, "patch closeSync");
            assert.match(fs$close.toString(), /graceful-fs shared queue/, "patch fs.close");
            assert.match(fs$closeSync.toString(), /graceful-fs shared queue/, "patch fs.closeSync");
            assert.match(realFs.close.toString(), /graceful-fs shared queue/, "patch gfs.close");
            assert.match(realFs.closeSync.toString(), /graceful-fs shared queue/, "patch gfs.closeSync");

            const importFresh = require("import-fresh");
            const newGFS = importFresh(adone.getPath("lib/glosses/fs/base.js")).default;
            assert.equal(realFs.close, fs$close);
            assert.equal(realFs.closeSync, fs$closeSync);
            assert.equal(newGFS.close, fs$close);
            assert.equal(newGFS.closeSync, fs$closeSync);
        });
    });

    it("open lots of stuff", (done) => {
        // Get around EBADF from libuv by making sure that stderr is opened
        // Otherwise Darwin will refuse to give us a FD for stderr!
        process.stderr.write("");

        // How many parallel open()'s to do
        const n = 1024;
        let opens = 0;
        const fds = [];
        let going = true;
        let closing = false;
        let doneCalled = 0;

        const go = () => {
            opens++;
            adone.fs.base.open(__filename, "r", (er, fd) => {
                if (er) {
                    throw er;
                }
                fds.push(fd);
                if (going) {
                    go();
                }
            });
        };

        for (let i = 0; i < n; i++) {
            go();
        }

        const dn = () => {
            if (closing) {
                return;
            }
            doneCalled++;

            if (fds.length === 0) {
                // First because of the timeout
                // Then to close the fd's opened afterwards
                // Then this time, to complete.
                // Might take multiple passes, depending on CPU speed
                // and ulimit, but at least 3 in every case.
                assert.ok(doneCalled >= 2);
                return done();
            }

            closing = true;
            setTimeout(() => {
                // console.error('do closing again')
                closing = false;
                dn();
            }, 100);

            // console.error('closing time')
            const closes = fds.slice(0);
            fds.length = 0;
            closes.forEach((fd) => {
                adone.fs.base.close(fd, (er) => {
                    if (er) {
                        throw er;
                    }
                });
            });
        };

        // should hit ulimit pretty fast
        setTimeout(() => {
            going = false;
            assert.equal(opens - fds.length, n);
            dn();
        }, 100);
    });

    describe("open", () => {
        it("open an existing file works", (done) => {
            const fs = adone.fs.base;
            const fd = fs.openSync(__filename, "r");
            fs.closeSync(fd);
            fs.open(__filename, "r", (er, fd) => {
                if (er) {
                    throw er;
                }
                fs.close(fd, (er) => {
                    if (er) {
                        throw er;
                    }
                    done();
                });
            });
        });

        it("open a non-existing file throws", (done) => {
            const fs = adone.fs.base;
            let er;
            let fd;
            try {
                fd = fs.openSync("this file does not exist", "r");
            } catch (x) {
                er = x;
            }
            assert.ok(er, "should throw");
            assert.notOk(fd, "should not get an fd");
            assert.equal(er.code, "ENOENT");

            fs.open("neither does this file", "r", (er, fd) => {
                assert.ok(er, "should throw");
                assert.notOk(fd, "should not get an fd");
                assert.equal(er.code, "ENOENT");
                done();
            });
        });
    });

    describe("read-write-stream", () => {
        const p = adone.path.resolve(__dirname, "files");

        process.chdir(__dirname);

        // Make sure to reserve the stderr fd
        process.stderr.write("");

        const num = 4097;
        const paths = new Array(num);

        after(() => {
            adone.fs.removeSync(p);
        });

        it("write files", (done) => {
            const fs = adone.fs.base;
            adone.fs.removeSync(p);
            adone.fs.mkdirpSync(p);

            expect(num).checks(done);

            for (let i = 0; i < num; ++i) {
                paths[i] = `files/file-${i}`;
                const stream = fs.createWriteStream(paths[i]);
                stream.on("finish", () => {
                    expect(true).to.be.ok.mark();
                });
                stream.write("content");
                stream.end();
            }
        });

        it("read files", (done) => {
            const fs = adone.fs.base;
            // now read them
            expect(num).checks(done);
            for (let i = 0; i < num; ++i) {
                // eslint-disable-next-line no-loop-func
                const stream = fs.createReadStream(paths[i]);
                let data = "";
                stream.on("data", (c) => {
                    data += c;
                });
                stream.on("end", () => {
                    expect(data).to.be.equal("content").mark();
                });
            }
        });
    });
});
