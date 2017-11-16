describe("fast", "transform", "unpack", () => {
    const {
        is,
        collection: {
            BufferList
        },
        fast,
        fs
    } = adone;

    /**
     * @type {adone.fs.Directory}
     */
    let tmpdir;

    before(async () => {
        tmpdir = await adone.fs.Directory.createTmp();
    });

    afterEach(async () => {
        await tmpdir.clean();
    });

    after(async () => {
        await tmpdir.unlink();
    });

    describe("tar", () => {
        it("should unpack files", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", { contents: "abc" });
            await input.addFile("b", { contents: "def" });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");

            expect(files).to.have.length(2);
            {
                const entry = files.find((x) => x.basename === "a");
                expect(entry.contents.toString()).to.be.deep.equal("abc");
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(entry.contents.toString()).to.be.deep.equal("def");
            }
        });

        it("should set proper file mode", {
            skip: is.windows
        }, async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", { contents: "abc", mode: 0o444 });
            await input.addFile("b", { contents: "def", mode: 0o641 });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");

            expect(files).to.have.length(2);
            {
                const entry = files.find((x) => x.basename === "a");
                expect(entry.stat.mode & 0o777).to.be.equal(0o444);
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(entry.stat.mode & 0o777).to.be.equal(0o641);
            }
        });

        it("should set proper file mtime", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", { mtime: new Date(1000) });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");

            expect(files).to.have.length(1);
            expect(files[0].stat.mtimeMs).to.be.equal(1000);
        });

        it("should unpack directories", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", "b", { contents: "abc" });
            await input.addDirectory("c");

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");

            expect(files).to.have.length(3);
            {
                const entry = files.find((x) => x.basename === "a");
                expect(entry.isDirectory()).to.be.true;
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(entry.contents.toString()).to.be.equal("abc");
            }
            {
                const entry = files.find((x) => x.basename === "c");
                expect(entry.isDirectory()).to.be.true;
            }
        });

        it("should set proper directory mode", {
            skip: is.windows
        }, async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("a", { mode: 0o700 });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");

            expect(files).to.have.length(1);
            expect(files[0].stat.mode & 0o777).to.be.equal(0o700);
        });

        it("should set proper directory mtime", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("a", { mtime: new Date(1000) });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");

            expect(files).to.have.length(1);
            expect(files[0].stat.mtimeMs).to.be.equal(1000);
        });

        // TODO: handle nested directories mtime?

        it("should handle symlinks", {
            skip: is.windows
        }, async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", { contents: "world" });
            await fs.symlink("hello", input.getFile("symlink").path());
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"), { links: true })
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");

            expect(files).to.have.length(2);
            {
                const entry = files.find((x) => x.basename === "symlink");
                expect(entry.isSymbolic()).to.be.true;
                expect(entry.symlink).to.be.equal("hello");
            }
            {
                const entry = files.find((x) => x.basename === "hello");
                expect(entry.contents.toString()).to.be.equal("world");
            }
        });

        it("should unpack files into a directory with the name of the archive file with no extension", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", "world");
            await input.addFile("a");
            await input.addDirectory("b");
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"), { links: true })
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.tar"))
                .unpack("tar");
            expect(files).to.have.length(4);
            {
                const entry = files.find((x) => x.basename === "world");
                expect(entry.path).to.be.equal(output.getFile("archive", "hello", "world").path());
            }
            {
                const entry = files.find((x) => x.basename === "hello");
                expect(entry.path).to.be.equal(output.getFile("archive", "hello").path());
            }
            {
                const entry = files.find((x) => x.basename === "a");
                expect(entry.path).to.be.equal(output.getFile("archive", "a").path());
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(entry.path).to.be.equal(output.getFile("archive", "b").path());
            }
        });
    });

    describe("zip", () => {
        const streamToString = async (stream) => {
            const buffer = await stream.pipe(new BufferList());
            return buffer.toString();
        };

        it("should unpack files", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", { contents: "abc" });
            await input.addFile("b", { contents: "def" });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.zip"))
                .unpack("zip");

            expect(files).to.have.length(2);
            {
                const entry = files.find((x) => x.basename === "a");
                expect(await streamToString(entry.contents)).to.be.equal("abc");
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(await streamToString(entry.contents)).to.be.deep.equal("def");
            }
        });

        it("should set proper file mode", {
            skip: is.windows
        }, async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", { contents: "abc", mode: 0o444 });
            await input.addFile("b", { contents: "def", mode: 0o641 });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.zip"))
                .unpack("zip");

            expect(files).to.have.length(2);
            {
                const entry = files.find((x) => x.basename === "a");
                expect(entry.stat.mode & 0o777).to.be.equal(0o444);
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(entry.stat.mode & 0o777).to.be.equal(0o641);
            }
        });

        it("should set proper file mtime", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", { mtime: new Date(1234567890000) });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.zip"))
                .unpack("zip");

            expect(files).to.have.length(1);
            expect(files[0].stat.mtimeMs).to.be.equal(1234567890000);
        });

        it("should unpack directories", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("a", "b", { contents: "abc" });
            await input.addDirectory("c");

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.zip"))
                .unpack("zip");

            expect(files).to.have.length(3);
            {
                const entry = files.find((x) => x.basename === "a");
                expect(entry.isDirectory()).to.be.true;
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(await streamToString(entry.contents)).to.be.equal("abc");
            }
            {
                const entry = files.find((x) => x.basename === "c");
                expect(entry.isDirectory()).to.be.true;
            }
        });

        it("should set proper directory mode", {
            skip: is.windows
        }, async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("a", { mode: 0o700 });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.zip"))
                .unpack("zip");

            expect(files).to.have.length(1);
            expect(files[0].stat.mode & 0o777).to.be.equal(0o700);
        });

        it("should set proper directory mtime", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("a", { mtime: new Date(1234567890000) });

            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.zip"))
                .unpack("zip");

            expect(files).to.have.length(1);
            expect(files[0].stat.mtimeMs).to.be.equal(1234567890000);
        });

        // TODO: handle nested directories mtime?

        it("should unpack files into a directory with the name of the archive file with no extension", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", "world");
            await input.addFile("a");
            await input.addDirectory("b");
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"), { links: true })
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            const files = await fast
                .src(output.getFile("archive.zip"))
                .unpack("zip");
            expect(files).to.have.length(4);
            {
                const entry = files.find((x) => x.basename === "world");
                expect(entry.path).to.be.equal(output.getFile("archive", "hello", "world").path());
            }
            {
                const entry = files.find((x) => x.basename === "hello");
                expect(entry.path).to.be.equal(output.getFile("archive", "hello").path());
            }
            {
                const entry = files.find((x) => x.basename === "a");
                expect(entry.path).to.be.equal(output.getFile("archive", "a").path());
            }
            {
                const entry = files.find((x) => x.basename === "b");
                expect(entry.path).to.be.equal(output.getFile("archive", "b").path());
            }
        });
    });
});
