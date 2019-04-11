const {
    is,
    archive: { tar },
    stream: { concat },
    std
} = adone;

describe("archive", "tar", "raw", () => {
    const fixtures = new adone.fs.Directory(std.path.join(__dirname, "fixtures"));

    describe("pack", () => {
        it("one file", async () => {
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

            const data = await pack.pipe(concat.create());
            expect(data.length & 511).to.be.equal(0);
            const file = await fixtures.get("one-file.tar");
            expect(data).to.be.deep.equal(await file.contents("buffer"));
        });

        it("multi file", async () => {
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

            const data = await pack.pipe(concat.create());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getFile("multi-file.tar").contents("buffer"));
        });

        it("pax", async () => {
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

            const data = await pack.pipe(concat.create());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getFile("pax.tar").contents("buffer"));
        });

        it("types", async () => {
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
                size: 9 // Should convert to zero
            });

            pack.finalize();

            const data = await pack.pipe(concat.create());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getFile("types.tar").contents("buffer"));
        });

        it("long name", async () => {
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

            const data = await pack.pipe(concat.create());
            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getFile("long-name.tar").contents("buffer"));
        });

        it("large uid gid", async () => {
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

            const data = await pack.pipe(concat.create());

            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getFile("large-uid-gid.tar").contents("buffer"));
        });

        it("unicode", async () => {
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

            const data = await pack.pipe(concat.create());

            expect(data.length & 511).to.be.equal(0);
            expect(data).to.be.deep.equal(await fixtures.getFile("unicode.tar").contents("buffer"));
        });
    });

    describe("unpack", () => {
        const clamp = function (index, len, defaultValue) {
            if (!is.number(index)) {
                return defaultValue;
            }
            index = ~~index; // Coerce to integer.
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

        it("one file", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("one-file.tar").contents("buffer"));

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

        it("chunked one file", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            const b = await fixtures.getFile("one-file.tar").contents("buffer");

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

        it("multi file", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("multi-file.tar").contents("buffer"));

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

        it("chunked multi file", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            const b = await fixtures.getFile("multi-file.tar").contents("buffer");
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

        it("pax", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("pax.tar").contents("buffer"));

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

        it("types", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("types.tar").contents("buffer"));

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

        it("long name", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("long-name.tar").contents("buffer"));

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

        it("unicode bsd", async () => { // can unpack a bsdtar unicoded tarball
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("unicode-bsd.tar").contents("buffer"));

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

        it("unicode", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("unicode.tar").contents("buffer"));

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

        it("name is 100", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("name-is-100.tar").contents("buffer"));

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header.name).to.have.lengthOf(100);
            expect(entries[0].data).to.be.deep.equal(Buffer.from("hello\n"));
        });

        it("invalid file", (done) => {
            const extract = new tar.RawUnpackStream();

            extract.on("error", (err) => {
                assert(Boolean(err));
                extract.destroy();
                done();
            });
            fixtures.getFile("invalid.tgz").contents("buffer").then((data) => {
                extract.end(data);
            });
        });

        it("space prefixed", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("space.tar").contents("buffer"));

            entries = await entries;

            expect(entries).to.have.lengthOf(4);
        });

        it("gnu long path", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });

            extract.end(await fixtures.getFile("gnu-long-path.tar").contents("binary"));

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header.name).to.have.length.at.least(100);
        });

        it("base 256 uid and gid", async () => {
            const extract = new tar.RawUnpackStream();

            let entries = new Promise((resolve) => {
                const entries = [];
                extract.on("entry", (header, stream, callback) => {
                    stream.pipe(concat.create()).then((data) => {
                        entries.push({ header, data });
                        callback();
                    });
                });
                extract.on("finish", () => resolve(entries));
            });
            extract.end(await fixtures.getFile("base-256-uid-gid.tar").contents("buffer"));

            entries = await entries;

            expect(entries).to.have.lengthOf(1);
            expect(entries[0].header.uid).to.be.equal(116435139);
            expect(entries[0].header.gid).to.be.equal(1876110778);
        });

        it("base 256 size", async () => {
            const extract = new tar.RawUnpackStream();
            const p = new Promise((resolve) => {
                extract.on("entry", (header, stream, callback) => {
                    expect(header).to.be.deep.equal({
                        name: "test.txt",
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
                    });
                    callback();
                });
                extract.on("finish", resolve);
            });
            extract.end(await fixtures.getFile("base-256-size.tar").contents("buffer"));
            await p;
        });

        it("latin-1", async (done) => { // can unpack filenames encoded in latin-1
            // This is the older name for the "latin1" encoding in Node
            const extract = new tar.RawUnpackStream({ filenameEncoding: "binary" });
            let noEntries = false;

            extract.on("entry", (header, stream, callback) => {
                assert.deepEqual(header, {
                    name: "En français, s'il vous plaît?.txt",
                    mode: parseInt("644", 8),
                    uid: 0,
                    gid: 0,
                    size: 14,
                    mtime: new Date(1495941034000),
                    type: "file",
                    linkname: null,
                    uname: "root",
                    gname: "root",
                    devmajor: 0,
                    devminor: 0
                });

                stream.pipe(concat.create((data) => {
                    noEntries = true;
                    assert.equal(data.toString(), "Hello, world!\n");
                    callback();
                }));
            });

            extract.on("finish", () => {
                assert.ok(noEntries);
                done();
            });

            extract.end(await fixtures.getFile("latin1.tar").contents("buffer"));
        });

        it("incomplete", async (done) => {
            const extract = new tar.RawUnpackStream();

            extract.on("entry", (header, stream, callback) => {
                callback();
            });

            extract.on("error", (err) => {
                assert.equal(err.message, "Unexpected end of data");
                done();
            });

            extract.on("finish", () => {
                assert.false("should not finish");
            });

            extract.end(await fixtures.getFile("incomplete.tar").contents("buffer"));
        });
    });

    describe.skip("slow", function () {
        this.timeout(1000 * 1000);

        it("huge", async (done) => {
            const extract = new tar.RawUnpackStream();
            let noEntries = false;
            const hugeFileSize = 8804630528; // ~8.2GB
            let dataLength = 0;

            const countStream = new std.stream.Writable();
            countStream._write = function (chunk, encoding, done) {
                dataLength += chunk.length;
                done();
            };

            // Make sure we read the correct pax size entry for a file larger than 8GB.
            extract.on("entry", (header, stream, callback) => {
                assert.deepEqual(header, {
                    devmajor: 0,
                    devminor: 0,
                    gid: 20,
                    gname: "staff",
                    linkname: null,
                    mode: 420,
                    mtime: new Date(1521214967000),
                    name: "huge.txt",
                    pax: {
                        "LIBARCHIVE.creationtime": "1521214954",
                        "SCHILY.dev": "16777218",
                        "SCHILY.ino": "91584182",
                        "SCHILY.nlink": "1",
                        atime: "1521214969",
                        ctime: "1521214967",
                        size: hugeFileSize.toString()
                    },
                    size: hugeFileSize,
                    type: "file",
                    uid: 502,
                    uname: "apd4n"
                });

                noEntries = true;
                stream.pipe(countStream);
            });

            extract.on("finish", () => {
                assert.ok(noEntries);
                assert.equal(dataLength, hugeFileSize);
                done();
            });

            const gunzip = std.zlib.createGunzip();
            const reader = std.fs.createReadStream((await fixtures.get("huge.tar.gz")).path());
            reader.pipe(gunzip).pipe(extract);
        });
    });
});
