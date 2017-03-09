const { archive: { tar }, stream: { concat }, std } = adone;

describe("glosses", "archives", "tar", "raw", () => {
    const fixtures = new adone.fs.Directory(std.path.join(__dirname, "fixtures"));

    describe("pack", () => {
        specify("one file", async () => {
            const pack = new tar.RawPackStream();

            pack.entry({
                name: "test.txt",
                mtime: new Date(1387580181000),
                mode: parseInt("644", 8),
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20
            }, "hello world\n");

            pack.finalize();

            const data = await pack.pipe(concat());
            expect(data.length & 511).to.be.equal(0);
            const file = await fixtures.get("one-file.tar");
            expect(data).to.be.deep.equal(await file.content(null));
        });

        specify("multi file", async () => {
            const pack = new tar.RawPackStream();

            pack.entry({
                name: "file-1.txt",
                mtime: new Date(1387580181000),
                mode: parseInt("644", 8),
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20
            }, "i am file-1\n");

            pack.entry({
                name: "file-2.txt",
                mtime: new Date(1387580181000),
                mode: parseInt("644", 8),
                size: 12,
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20
            }).end("i am file-2\n");

            pack.finalize();

            const data = await pack.pipe(concat());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getVirtualFile("multi-file.tar").content(null));
        });

        specify("pax", async () => {
            const pack = new tar.RawPackStream();

            pack.entry({
                name: "pax.txt",
                mtime: new Date(1387580181000),
                mode: parseInt("644", 8),
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20,
                pax: { special: "sauce" }
            }, "hello world\n");

            pack.finalize();

            const data = await pack.pipe(concat());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getVirtualFile("pax.tar").content(null));
        });

        specify("types", async () => {
            const pack = new tar.RawPackStream();

            pack.entry({
                name: "directory",
                mtime: new Date(1387580181000),
                type: "directory",
                mode: parseInt("755", 8),
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20
            });

            pack.entry({
                name: "directory-link",
                mtime: new Date(1387580181000),
                type: "symlink",
                linkname: "directory",
                mode: parseInt("755", 8),
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20,
                size: 9  // Should convert to zero
            });

            pack.finalize();

            const data = await pack.pipe(concat());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getVirtualFile("types.tar").content(null));
        });

        specify("long name", async () => {
            const pack = new tar.RawPackStream();

            pack.entry({
                name: "my/file/is/longer/than/100/characters/and/should/use/the/prefix/header/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/filename.txt",
                mtime: new Date(1387580181000),
                type: "file",
                mode: parseInt("644", 8),
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20
            }, "hello long name\n");

            pack.finalize();

            const data = await pack.pipe(concat());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getVirtualFile("long-name.tar").content(null));
        });

        specify("large uid gid", async () => {
            const pack = new tar.RawPackStream();

            pack.entry({
                name: "test.txt",
                mtime: new Date(1387580181000),
                mode: parseInt("644", 8),
                uname: "maf",
                gname: "staff",
                uid: 1000000001,
                gid: 1000000002
            }, "hello world\n");

            pack.finalize();

            const data = await pack.pipe(concat());

            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getVirtualFile("large-uid-gid.tar").content(null));
        });

        specify("unicode", async () => {
            const pack = new tar.RawPackStream();

            pack.entry({
                name: "høstål.txt",
                mtime: new Date(1387580181000),
                type: "file",
                mode: parseInt("644", 8),
                uname: "maf",
                gname: "staff",
                uid: 501,
                gid: 20
            }, "høllø\n");

            pack.finalize();

            const data = await pack.pipe(concat());

            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getVirtualFile("unicode.tar").content(null));
        });
    });

    describe("extract", () => {
        const clamp = function (index, len, defaultValue) {
            if (typeof index !== "number") {
                return defaultValue;
            }
            index = ~~index;  // Coerce to integer.
            if (index >= len) {
                return len;
            }
            if (index >= 0) {
                return index;
            }
            index += len;
            if (index >= 0) {
                return index;
            }
            return 0;
        };

        specify("one file", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("one-file.tar").content(null));

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header).to.be.deep.equal({
                name: "test.txt",
                mode: 0o644,
                uid: 501,
                gid: 20,
                size: 12,
                mtime: new Date(1387580181000),
                type: "file",
                linkname: null,
                uname: "maf",
                gname: "staff",
                devmajor: 0,
                devminor: 0
            });
            expect(entries[0].data.toString()).to.be.equal("hello world\n");
        });

        specify("chunked one file", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            const b = await fixtures.getVirtualFile("one-file.tar").content(null);

            for (let i = 0; i < b.length; i += 321) {
                extract.write(b.slice(i, clamp(i + 321, b.length, b.length)));
            }
            extract.end();

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header).to.be.deep.equal({
                name: "test.txt",
                mode: 0o644,
                uid: 501,
                gid: 20,
                size: 12,
                mtime: new Date(1387580181000),
                type: "file",
                linkname: null,
                uname: "maf",
                gname: "staff",
                devmajor: 0,
                devminor: 0
            });
            expect(entries[0].data.toString()).to.be.equal("hello world\n");
        });

        specify("multi file", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("multi-file.tar").content(null));

            entries = await entries;

            expect(entries).to.be.deep.equal([{
                header: {
                    name: "file-1.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 12,
                    mtime: new Date(1387580181000),
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: Buffer.from("i am file-1\n")
            }, {
                header: {
                    name: "file-2.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 12,
                    mtime: new Date(1387580181000),
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: Buffer.from("i am file-2\n")
            }]);
        });

        specify("chunked multi file", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            const b = await fixtures.getVirtualFile("multi-file.tar").content(null);
            for (let i = 0; i < b.length; i += 321) {
                extract.write(b.slice(i, clamp(i + 321, b.length, b.length)));
            }
            extract.end();

            entries = await entries;

            expect(entries).to.be.deep.equal([{
                header: {
                    name: "file-1.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 12,
                    mtime: new Date(1387580181000),
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: Buffer.from("i am file-1\n")
            }, {
                header: {
                    name: "file-2.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 12,
                    mtime: new Date(1387580181000),
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: Buffer.from("i am file-2\n")
            }]);
        });

        specify("pax", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("pax.tar").content(null));

            entries = await entries;

            expect(entries).to.be.deep.equal([{
                header: {
                    name: "pax.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 12,
                    mtime: new Date(1387580181000),
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0,
                    pax: { path: "pax.txt", special: "sauce" }
                },
                data: Buffer.from("hello world\n")
            }]);
        });

        specify("types", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("types.tar").content(null));

            entries = await entries;

            expect(entries).to.be.deep.equal([{
                header: {
                    name: "directory",
                    mode: parseInt("755", 8),
                    uid: 501,
                    gid: 20,
                    size: 0,
                    mtime: new Date(1387580181000),
                    type: "directory",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: []
            }, {
                header: {
                    name: "directory-link",
                    mode: parseInt("755", 8),
                    uid: 501,
                    gid: 20,
                    size: 0,
                    mtime: new Date(1387580181000),
                    type: "symlink",
                    linkname: "directory",
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: []
            }]);
        });

        specify("long name", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("long-name.tar").content(null));

            entries = await entries;

            expect(entries).to.be.deep.equal([{
                header: {
                    name: "my/file/is/longer/than/100/characters/and/should/use/the/prefix/header/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/filename.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 16,
                    mtime: new Date(1387580181000),
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: Buffer.from("hello long name\n")
            }]);
        });

        specify("unicode bsd", async () => {  // can unpack a bsdtar unicoded tarball
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("unicode-bsd.tar").content(null));

            entries = await entries;

            expect(entries).to.be.deep.equal([{
                header: {
                    name: "høllø.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 4,
                    mtime: new Date(1387588646000),
                    pax: { "SCHILY.dev": "16777217", "SCHILY.ino": "3599143", "SCHILY.nlink": "1", atime: "1387589077", ctime: "1387588646", path: "høllø.txt" },
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: Buffer.from("hej\n")
            }]);
        });

        specify("unicode", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("unicode.tar").content(null));

            entries = await entries;

            expect(entries).to.be.deep.equal([{
                header: {
                    name: "høstål.txt",
                    mode: parseInt("644", 8),
                    uid: 501,
                    gid: 20,
                    size: 8,
                    mtime: new Date(1387580181000),
                    pax: { path: "høstål.txt" },
                    type: "file",
                    linkname: null,
                    uname: "maf",
                    gname: "staff",
                    devmajor: 0,
                    devminor: 0
                },
                data: Buffer.from("høllø\n")
            }]);
        });

        specify("name is 100", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("name-is-100.tar").content(null));

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header.name).to.have.lengthOf(100);
            expect(entries[0].data).to.be.deep.equal(Buffer.from("hello\n"));
        });

        specify("invalid file", (done) => {
            const extract = new tar.RawExtractStream();

            extract.on("error", function (err) {
                assert(!!err);
                extract.destroy();
                done();
            });
            fixtures.getVirtualFile("invalid.tgz").content(null).then((data) => {
                extract.end(data);
            });
        });

        specify("space prefixed", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("space.tar").content(null));

            entries = await entries;

            expect(entries).to.have.lengthOf(4);
        });

        specify("gnu long path", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("gnu-long-path.tar").content(null));

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header.name).to.have.length.at.least(100);
        });

        specify("base 256 uid and gid", async () => {
            const extract = new tar.RawExtractStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getVirtualFile("base-256-uid-gid.tar").content(null));

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header.uid).to.be.equal(116435139);
            expect(entries[0].header.gid).to.be.equal(1876110778);
        });
    });
});
