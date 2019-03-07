const proxyquire = require("proxyquire");

const {
    assertion,
    fs: { writeFileAtomic },
    std: { fs: { readFile, unlink, unlinkSync, open, write, close, fsync, rename }, os: { tmpdir }, path: { join } }
} = adone;

assertion.use(assertion.extension.checkmark);

const srcPath = join(adone.ROOT_PATH, "lib", "glosses", "fs", "write_file_atomic");

describe("fs", "writeFileAtomic", () => {
    const files = [];

    after(() => {
        for (const dest of files) {
            try {
                unlinkSync(dest);
            } catch (_) {
                //
            }
        }
    });

    let nextId = 0;

    const getDest = function (name) {
        if (!name) {
            name = `hello${nextId++}`;
        }
        const dest = join(tmpdir(), name);
        files.push(dest);
        return dest;
    };

    it("write a file", (done) => {
        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic(dest, content, (err) => {
            assert.notExists(err);
            readFile(dest, (err, data) => {
                assert.notExists(err);
                assert.equal(Buffer.compare(data, content), 0);
                done();
            });
        });
    });

    it("parallel writes", (done) => {
        expect(4).checks(done);

        const dest = getDest();
        const content1 = Buffer.allocUnsafe(4096).fill("AB"); // 4 KB
        const content2 = Buffer.allocUnsafe(4096).fill("CD"); // 4 KB

        let countdown = 2;

        const check = function () {
            if (--countdown !== 0) {
                return;
            }

            readFile(dest, (err, data) => {
                expect(err).to.not.exist.mark();
                // we expect either content1 or content2 to be there
                expect(Buffer.compare(data, content2) === 0 || Buffer.compare(data, content1) === 0).to.be.true.mark();
            });
        };

        writeFileAtomic(dest, content1, (err) => {
            expect(err).to.not.exist.mark();
            check();
        });

        writeFileAtomic(dest, content2, (err) => {
            expect(err).to.not.exist.mark();
            check();
        });
    });

    it("calls fsync", (done) => {
        expect(5).checks(done);

        const writeFileAtomic = proxyquire(srcPath, {
            fs: {
                open,
                write,
                close,
                fsync(fd, cb) {
                    expect("fsync called").to.be.ok.mark();
                    return fsync(fd, cb);
                },
                rename(source, dest, cb) {
                    expect("rename called").to.be.ok.mark();
                    return rename(source, dest, cb);
                }
            }
        });

        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic.default(dest, content, (err) => {
            expect(err).to.not.exist.mark();
            readFile(dest, (err, data) => {
                expect(err).to.not.exist.mark();
                expect(Buffer.compare(data, content)).to.equal(0).mark();
            });
        });
    });

    it("unlinks if it errors during rename", (done) => {
        expect(4).checks(done);

        let _source;
        const writeFileAtomic = proxyquire(srcPath, {
            fs: {
                open,
                write,
                close,
                unlink(file, cb) {
                    expect(file).to.equal(_source).mark();
                    return unlink(file, cb);
                },
                rename(source, dest, cb) {
                    _source = source;
                    process.nextTick(cb, new Error("kaboom"));
                }
            }
        });

        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic.default(dest, content, (err) => {
            expect(err.message).to.equal("kaboom").mark();
            readFile(dest, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
            readFile(_source, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
        });
    });

    it("unlinks if it errors during write", (done) => {
        expect(4).checks(done);

        let _source;
        const writeFileAtomic = proxyquire(srcPath, {
            fs: {
                open(dest, flags, cb) {
                    _source = dest;
                    return open(dest, flags, cb);
                },
                write(fd, content, offset, cb) {
                    process.nextTick(cb, new Error("kaboom"));
                },
                close,
                unlink(file, cb) {
                    expect(file).to.equal(_source).mark();
                    return unlink(file, cb);
                }
            }
        });

        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic.default(dest, content, (err) => {
            expect(err.message).to.equal("kaboom").mark();
            readFile(dest, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
            readFile(_source, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
        });
    });

    it("unlinks if it errors during fsync", (done) => {
        expect(4).checks(done);

        let _source;
        const writeFileAtomic = proxyquire(srcPath, {
            fs: {
                open(dest, flags, cb) {
                    _source = dest;
                    return open(dest, flags, cb);
                },
                write,
                close,
                fsync(fd, cb) {
                    process.nextTick(cb, new Error("kaboom"));
                },
                unlink(file, cb) {
                    expect(file).to.equal(_source).mark();
                    return unlink(file, cb);
                }
            }
        });

        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic.default(dest, content, (err) => {
            expect(err.message).to.equal("kaboom").mark();
            readFile(dest, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
            readFile(_source, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
        });
    });

    it("retries if the write was not completed", (done) => {
        expect(5).checks(done);

        let first = true;
        const writeFileAtomic = proxyquire(srcPath, {
            fs: {
                open,
                write(fd, content, offset, cb) {
                    expect("fs.write").to.be.ok.mark();
                    if (first) {
                        first = false;
                        write(fd, content, 0, 16, cb);
                        return;
                    }

                    write(fd, content, offset, cb);
                },
                close,
                unlink
            }
        });

        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic.default(dest, content, (err) => {
            expect(err).to.not.exist.mark();
            readFile(dest, (err, data) => {
                expect(err).to.not.exist.mark();
                expect(Buffer.compare(data, content)).to.equal(0).mark();
            });
        });
    });

    it("errors if open errors", (done) => {
        expect(3).checks(done);

        let _source;
        const writeFileAtomic = proxyquire(srcPath, {
            fs: {
                open(dest, flags, cb) {
                    _source = dest;
                    process.nextTick(cb, new Error("kaboom"));
                }
            }
        });

        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic.default(dest, content, (err) => {
            expect(err.message).to.equal("kaboom").mark();
            readFile(dest, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
            readFile(_source, (err) => {
                expect(err.code).to.equal("ENOENT").mark();
            });
        });
    });

    it("retries on EMFILE", (done) => {
        expect(3).checks(done);

        let first = true;
        const writeFileAtomic = proxyquire(srcPath, {
            fs: {
                open(dest, flags, cb) {
                    if (first) {
                        first = false;
                        const err = new Error("kaboom");
                        err.code = "EMFILE";
                        process.nextTick(cb, err);
                        return;
                    }

                    return open(dest, flags, cb);
                },
                write,
                close,
                unlink
            }
        });

        const dest = getDest();
        const content = Buffer.allocUnsafe(4096); // 4 KB

        writeFileAtomic.default(dest, content, (err) => {
            expect(err).to.not.exist.mark();
            readFile(dest, (err, data) => {
                expect(err).to.not.exist.mark();
                expect(Buffer.compare(data, content)).that.equal(0).mark();
            });
        });
    });

    it.skip("write 2000 files in parallel", function (done) {
        this.timeout(60 * 1000);
        const MAX = 2000;
        let total = 0;
        expect(1).checks(done);

        for (let i = 0; i < MAX; i++) {
            const dest = getDest();
            const content = Buffer.allocUnsafe(4096); // 4 KB

            writeFileAtomic(dest, content, (err) => {
                if (err) {
                    assert.notExists(err);
                    return;
                }

                if (++total === MAX) {
                    expect(`${total} writes completed`).to.be.ok.mark();
                }
            });
        }
    });

    it("write multibyte unicode sybols", (done) => {
        const dest = getDest();
        const content = '{"name":"tajné jménoed25519","id":"QmSvTNE2Eo7SxRXjmEaZnE91cNpduKjYFBtd2LYC4Rsoeq"}';
        writeFileAtomic(dest, content, (err) => {
            assert.notExists(err);
            done();
        });
    });
});
