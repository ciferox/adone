const {
    is,
    collection: { BufferList },
    fast,
    fs,
    std: { path: { join } }
} = adone;

describe("fast", "extension", "extract", () => {
    let tmpdir;
    let srcFiles;

    describe("common", () => {
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
                    .extract();

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
                    .extract();

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
                    .extract();

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
                    .extract();

                expect(files).to.have.length(3);
                {
                    const entry = files.find((x) => x.basename === "a");
                    expect(entry.isDirectory()).to.be.true();
                }
                {
                    const entry = files.find((x) => x.basename === "b");
                    expect(entry.contents.toString()).to.be.equal("abc");
                }
                {
                    const entry = files.find((x) => x.basename === "c");
                    expect(entry.isDirectory()).to.be.true();
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
                    .extract();

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
                    .extract();

                expect(files).to.have.length(1);
                expect(files[0].stat.mtimeMs).to.be.equal(1000);
            });

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
                    .extract();

                expect(files).to.have.length(2);
                {
                    const entry = files.find((x) => x.basename === "symlink");
                    expect(entry.isSymbolic()).to.be.true();
                    expect(entry.symlink).to.be.equal("hello");
                }
                {
                    const entry = files.find((x) => x.basename === "hello");
                    expect(entry.contents.toString()).to.be.equal("world");
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
                    .extract();

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
                    .extract();

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
                    .extract();

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
                    .extract();

                expect(files).to.have.length(3);
                {
                    const entry = files.find((x) => x.basename === "a");
                    expect(entry.isDirectory()).to.be.true();
                }
                {
                    const entry = files.find((x) => x.basename === "b");
                    expect(await streamToString(entry.contents)).to.be.equal("abc");
                }
                {
                    const entry = files.find((x) => x.basename === "c");
                    expect(entry.isDirectory()).to.be.true();
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
                    .extract();

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
                    .extract();

                expect(files).to.have.length(1);
                expect(files[0].stat.mtimeMs).to.be.equal(1234567890000);
            });
        });
    });

    describe("complex", () => {
        const fixture = (...args) => join(__dirname, "fixtures", ...args);
        const srcNodePath = fixture("node");

        const checkExtraction = async (destPath) => {
            const destFiles = (await fs.readdirp(destPath)).map((item) => item.path);
            assert.sameMembers(srcFiles, destFiles);
        };

        before(async () => {
            tmpdir = await adone.fs.Directory.createTmp();
            srcFiles = (await fs.readdirp(srcNodePath)).map((item) => item.path);
        });

        afterEach(async () => {
            await tmpdir.unlink();
        });

        afterEach(async () => {
            await tmpdir.clean();
        });

        const archives = [
            ".zip",
            ".tar",
            ".tar.gz",
            ".tar.xz",
            ".tar.lzma",
            ".tar.br"
        ];

        for (const a of archives) {
            // eslint-disable-next-line no-loop-func
            describe(a, () => {
                const fileName = `node${a}`;
                it("extract with default options", async () => {
                    await fast.src(fixture(fileName))
                        .extract()
                        .dest(tmpdir.path());

                    await checkExtraction(tmpdir.getDirectory("node"));
                });

                it("extract with 'strip=1'", async () => {
                    await fast.src(fixture(fileName))
                        .extract({ strip: 1 })
                        .dest(tmpdir.path());

                    await checkExtraction(tmpdir.path());
                });

                it("symlinks should be valid", async () => {
                    await fast.src(fixture(fileName))
                        .extract({ strip: 1 })
                        .dest(tmpdir.path());

                    await checkExtraction(tmpdir.path());
                    assert.isTrue(await tmpdir.getFile("bin", "npm").isSymbolicLink());
                    assert.isTrue(await tmpdir.getFile("bin", "npx").isSymbolicLink());
                    await tmpdir.getFile("bin", "npm").stat();
                    await tmpdir.getFile("bin", "npx").stat();
                });
            });
        }
    });
});
