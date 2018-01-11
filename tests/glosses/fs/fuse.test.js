describe("fs", "fuse", () => {
    const {
        is,
        fs,
        std: {
            path
        }
    } = adone;

    const {
        fuse
    } = fs;

    let tmpdir;
    let mnt;

    before(async () => {
        tmpdir = await adone.fs.Directory.createTmp();
        mnt = tmpdir.path();
    });

    afterEach(async () => {
        await fuse.unmount(mnt);
    });

    after(async () => {
        await tmpdir.unlink();
    });

    const stat = (st) => {
        return {
            mtime: st.mtime || new Date(),
            atime: st.atime || new Date(),
            ctime: st.ctime || new Date(),
            size: !is.undefined(st.size) ? st.size : 0,
            mode: st.mode === "dir" ? 16877 : (st.mode === "file" ? 33188 : (st.mode === "link" ? 41453 : st.mode)),
            uid: !is.undefined(st.uid) ? st.uid : process.getuid(),
            gid: !is.undefined(st.gid) ? st.gid : process.getgid()
        };
    };

    specify("mount + unmount", async () => {
        await fuse.mount(mnt);
        await fuse.unmount(mnt);
    });

    specify("mount + unmount + mount", async () => {
        await fuse.mount(mnt);
        await fuse.unmount(mnt);
        await fuse.mount(mnt);
    });

    specify("mount point must exist", async () => {
        await assert.throws(async () => {
            await fuse.mount(path.join(mnt, "wtf"));
        }, "does not exist");
    });

    describe("write", () => {
        it("should work", async () => {
            let created = false;
            const data = Buffer.alloc(1024);
            let size = 0;

            const ops = {
                force: true,
                readdir(path, cb) {
                    if (path === "/") {
                        return cb(null, created ? ["hello"] : []);

                    }
                    return cb(fuse.ENOENT);
                },
                truncate(path, size, cb) {
                    cb(0);
                },
                getattr(path, cb) {
                    if (path === "/") {
                        return cb(null, stat({ mode: "dir", size: 4096 }));

                    }
                    if (path === "/hello" && created) {
                        return cb(null, stat({ mode: "file", size }));
                    }
                    return cb(fuse.ENOENT);
                },
                create(path, flags, cb) {
                    assert.ok(!created, "file not created yet");
                    created = true;
                    cb(0, 42);
                },
                release(path, fd, cb) {
                    cb(0);
                },
                write(path, fd, buf, len, pos, cb) {
                    buf.slice(0, len).copy(data, pos);
                    size = Math.max(pos + len, size);
                    cb(buf.length);
                }
            };

            await fuse.mount(mnt, ops);
            await fs.writeFile(tmpdir.getFile("hello").path(), "hello world");
            expect(data.slice(0, size)).to.be.deep.equal(Buffer.from("hello world"));
            await fuse.unmount(mnt);
        });
    });

    describe("read", () => {
        it("should work", async () => {
            const ops = {
                force: true,
                readdir(path, cb) {
                    if (path === "/") {
                        return cb(null, ["test"]);
                    }
                    return cb(fuse.ENOENT);
                },
                getattr(path, cb) {
                    if (path === "/") {
                        return cb(null, stat({ mode: "dir", size: 4096 }));
                    }
                    if (path === "/test") {
                        return cb(null, stat({ mode: "file", size: 11 }));
                    }
                    return cb(fuse.ENOENT);
                },
                open(path, flags, cb) {
                    cb(0, 42);
                },
                release(path, fd, cb) {
                    assert.equal(fd, 42);
                    cb(0);
                },
                read(path, fd, buf, len, pos, cb) {
                    const str = "hello world".slice(pos, pos + len);
                    if (!str) {
                        return cb(0);
                    }
                    buf.write(str);
                    return cb(str.length);
                }
            };

            await fuse.mount(mnt, ops);
            {
                const buf = await fs.readFile(path.join(mnt, "test"));
                expect(buf).to.be.deep.equal(Buffer.from("hello world"));
            }
            {
                const buf = await fs.readFile(path.join(mnt, "test"));
                expect(buf).to.be.deep.equal(Buffer.from("hello world"));
            }
            {
                const stream = fs.createReadStream(path.join(mnt, "test"), { start: 0, end: 4 });
                const buf = await stream.pipe(new adone.collection.BufferList());
                expect(buf).to.be.deep.equal(Buffer.from("hello"));
            }
            {
                const stream = fs.createReadStream(path.join(mnt, "test"), { start: 6, end: 10 });
                const buf = await stream.pipe(new adone.collection.BufferList());
                expect(buf).to.be.deep.equal(Buffer.from("world"));
            }
            await fuse.unmount(mnt);
        });
    });

    describe("readlink", () => {
        it("should work", async () => {
            const ops = {
                force: true,
                readdir(path, cb) {
                    if (path === "/") {
                        return cb(null, ["hello", "link"]);
                    }
                    return cb(fuse.ENOENT);
                },
                readlink(path, cb) {
                    cb(0, "hello");
                },
                getattr(path, cb) {
                    if (path === "/") {
                        return cb(null, stat({ mode: "dir", size: 4096 }));
                    }
                    if (path === "/hello") {
                        return cb(null, stat({ mode: "file", size: 11 }));
                    }
                    if (path === "/link") {
                        return cb(null, stat({ mode: "link", size: 5 }));

                    }
                    return cb(fuse.ENOENT);
                },
                open(path, flags, cb) {
                    cb(0, 42);
                },
                read(path, fd, buf, len, pos, cb) {
                    const str = "hello world".slice(pos, pos + len);
                    if (!str) {
                        return cb(0);
                    }
                    buf.write(str);
                    return cb(str.length);
                }
            };

            await fuse.mount(mnt, ops);
            {
                const stat = await fs.lstat(path.join(mnt, "link"));
                assert.equal(stat.size, 5);
            }
            {
                const stat = await fs.stat(path.join(mnt, "hello"));
                assert.equal(stat.size, 11, "correct size");
            }
            {
                const dest = await fs.readlink(path.join(mnt, "link"));
                assert.equal(dest, "hello");
            }
            {
                const buf = await fs.readFile(path.join(mnt, "link"));
                assert.deepEqual(buf, Buffer.from("hello world"));
            }
            await fuse.unmount(mnt);
        });
    });
});
