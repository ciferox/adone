describe("fast", "transform", "pack", () => {
    const {
        collection,
        archive: {
            tar,
            zip
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
        it("should correctly pack directories", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("a", "b", "c");
            await input.addDirectory("a", "d");
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const archive = output.getFile("archive.tar");
            expect(await archive.exists()).to.be.true;
            const extracted = await output.addDirectory("extracted");
            await new Promise((resolve) => {
                archive.contentsStream().pipe(tar.unpackStream(extracted)).on("finish", resolve);
            });
            expect(await extracted.getDirectory("a").exists()).to.be.true;
            expect(await extracted.getDirectory("a", "b").exists()).to.be.true;
            expect(await extracted.getDirectory("a", "b", "c").exists()).to.be.true;
            expect(await extracted.getDirectory("a", "d").exists()).to.be.true;
        });

        it("should pack directories with proper modes", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("a", { mode: 0o775 });
            await input.addDirectory("a", "b", { mode: 0o770 });
            await input.addDirectory("a", "b", "c", { mode: 0o700 });
            await input.addDirectory("a", "d", { mode: 0o711 });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const archive = output.getFile("archive.tar");
            expect(await archive.exists()).to.be.true;
            const extracted = await output.addDirectory("extracted");
            await new Promise((resolve) => {
                archive.contentsStream().pipe(tar.unpackStream(extracted)).on("finish", resolve);
            });
            expect(await extracted.getDirectory("a").exists()).to.be.true;
            expect(await extracted.getDirectory("a", "b").exists()).to.be.true;
            expect(await extracted.getDirectory("a", "b", "c").exists()).to.be.true;
            expect(await extracted.getDirectory("a", "d").exists()).to.be.true;

            expect(await extracted.getDirectory("a").mode() & 0o777).to.be.equal(0o775);
            expect(await extracted.getDirectory("a", "b").mode() & 0o777).to.be.equal(0o770);
            expect(await extracted.getDirectory("a", "b", "c").mode() & 0o777).to.be.equal(0o700);
            expect(await extracted.getDirectory("a", "d").mode() & 0o777).to.be.equal(0o711);
        });

        // TODO: test directories mtime?

        it("should set proper file mode", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", { mode: 0o741 });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const archive = output.getFile("archive.tar");
            expect(await archive.exists()).to.be.true;
            const extracted = await output.addDirectory("extracted");
            await new Promise((resolve) => {
                archive.contentsStream().pipe(tar.unpackStream(extracted)).on("finish", resolve);
            });

            expect(await extracted.getFile("hello").exists()).to.be.true;
            expect(await extracted.getFile("hello").mode() & 0o777).to.be.equal(0o741);
        });

        it("should set proper file mtime", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", {
                mode: 0o741,
                mtime: new Date(1000)
            });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const archive = output.getFile("archive.tar");
            expect(await archive.exists()).to.be.true;
            const extracted = await output.addDirectory("extracted");
            await new Promise((resolve) => {
                archive.contentsStream().pipe(tar.unpackStream(extracted)).on("finish", resolve);
            });

            expect(await extracted.getFile("hello").exists()).to.be.true;
            expect((await extracted.getFile("hello").stat()).mtimeMs).to.be.equal(1000);
        });

        it("should handle symlinks", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", { contents: "world" });
            await fs.symlink("hello", input.getFile("symlink").path());
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"), { links: true })
                .pack("tar", { filename: "archive.tar" })
                .dest(output);

            const archive = output.getFile("archive.tar");
            expect(await archive.exists()).to.be.true;
            const extracted = await output.addDirectory("extracted");
            await new Promise((resolve) => {
                archive.contentsStream().pipe(tar.unpackStream(extracted)).on("finish", resolve);
            });
            expect(await extracted.getFile("symlink").exists()).to.be.true;
            expect((await extracted.getFile("symlink").lstat()).isSymbolicLink()).to.be.true;
            expect(await extracted.getFile("symlink").readlink()).to.be.equal("hello");
            expect(await extracted.getFile("symlink").contents()).to.be.equal("world");
        });
    });

    describe("zip", () => {
        const readEntries = async (file) => {
            const entries = [];
            const zipfile = await zip.unpack.open(String(file), { lazyEntries: true });
            for (; ;) {
                const entry = await zipfile.readEntry(); // eslint-disable-line
                if (!entry) {
                    break;
                }
                const stream = await zipfile.openReadStream(entry); // eslint-disable-line
                entry.contents = (await stream.pipe(new collection.BufferList())).toString(); // eslint-disable-line
                entries.push(entry);
            }
            return entries;
        };

        it("should pack files", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", { contents: "world" });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(1);
            expect(entries[0].contents).to.be.equal("world");
        });

        it("should pack directories", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("dir", "a", { contents: "world2" });
            await input.addDirectory("emptry_dir");
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(3);
            {
                const entry = entries.find((x) => x.fileName === "dir/");
                expect(entry.contents).to.be.equal("");
            }
            {
                const entry = entries.find((x) => x.fileName === "dir/a");
                expect(entry.contents).to.be.equal("world2");
            }
            {
                const entry = entries.find((x) => x.fileName === "emptry_dir/");
                expect(entry.contents).to.be.equal("");
            }
        });

        it("should set proper file mode", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", { contents: "world", mode: 0o600 });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(1);
            expect((entries[0].externalFileAttributes >> 16) & 0o777).to.be.equal(0o600);
        });

        it("should set proper directory mode", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("dir", { mode: 0o700 });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(1);
            expect((entries[0].externalFileAttributes >> 16) & 0o777).to.be.equal(0o700);
        });

        it("should set proper file mode", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", { contents: "world", mode: 0o600 });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(1);
            expect((entries[0].externalFileAttributes >> 16) & 0o777).to.be.equal(0o600);
        });

        it("should set proper directory mode", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("dir", { mode: 0o700 });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(1);
            expect((entries[0].externalFileAttributes >> 16) & 0o777).to.be.equal(0o700);
        });

        it("should set proper file mtime", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addFile("hello", { contents: "world", mtime: new Date(1234567890000) });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(1);
            expect(entries[0].getLastModDate().unix()).to.be.equal(1234567890);
        });

        it("should set proper directory mtime", async () => {
            const input = await tmpdir.addDirectory("input");
            await input.addDirectory("hello", { mtime: new Date(1234567890000) });
            const output = await tmpdir.addDirectory("output");

            await fast
                .src(input.getFile("**", "*"))
                .pack("zip", { filename: "archive.zip" })
                .dest(output);

            expect(await output.getFile("archive.zip").exists()).to.be.true;
            const entries = await readEntries(output.getFile("archive.zip"));
            expect(entries).to.have.length(1);
            expect(entries[0].getLastModDate().unix()).to.be.equal(1234567890);
        });
    });
});
