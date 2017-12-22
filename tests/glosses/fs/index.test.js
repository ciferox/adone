const {
    fs,
    std: { path }
} = adone;

describe("fs", () => {
    let rootTmp = null;

    before(async () => {
        rootTmp = await adone.fs.Directory.createTmp();
    });

    afterEach(async () => {
        await rootTmp.clean();
    });

    after(async () => {
        await rootTmp.unlink();
    });

    describe("tail", () => {
        const path = (a) => adone.std.path.join(__dirname, "fixtures", "tail", a);
        const { tail } = adone.fs;

        it("should read the last 10", async () => {
            const res = await tail(path("a"));
            expect(res).to.have.lengthOf(10);
            expect(res).to.be.deep.equal([
                "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from));
        });

        it("should have an empty buffer at the end", async () => {
            const res = await tail(path("b"));
            expect(res).to.have.lengthOf(10);
            expect(res).to.be.deep.equal([
                "5", "6", "7", "8", "9",
                "10", "11", "12", "13", ""
            ].map(Buffer.from));
        });

        it("should return 3 lines", async () => {
            const res = await tail(path("a"), 3);
            expect(res).to.have.lengthOf(3);
            expect(res).to.be.deep.equal([
                "11", "12", "13"
            ].map(Buffer.from));
        });

        it("should use a custom separator", async () => {
            const res = await tail(path("c"), 3, { separator: ",,," });
            expect(res).to.be.deep.equal([
                "7", "8", "9"
            ].map(Buffer.from));
        });

        it("should read all the lines", async () => {
            const res = await tail(path("a"), 100);
            expect(res).to.be.deep.equal([
                "1", "2", "3", "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from));
        });

        it("should correctly work with different chuck lengths", async () => {
            let res = await tail(path("a"), 10, { chunkLength: 10101010 });
            expect(res).to.be.deep.equal([
                "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "1");
            res = await tail(path("a"), 10, { chunkLength: 1 });
            expect(res).to.be.deep.equal([
                "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "2");
            res = await tail(path("a"), 100, { chunkLength: 1 });
            expect(res).to.be.deep.equal([
                "1", "2", "3", "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "3");
            res = await tail(path("a"), 100, { chunkLength: 101010 });
            expect(res).to.be.deep.equal([
                "1", "2", "3", "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "4");
        });
    });

    describe("append", () => {
        it("should append to file", async () => {
            const tmp = await rootTmp.addDirectory("tmp");
            const tmpFile = path.join(tmp.path(), "appended");
            await fs.appendFile(tmpFile, "hello\n");
            expect(await fs.readLines(tmpFile)).to.be.deep.equal(["hello", ""]);
            await fs.appendFile(tmpFile, "world");
            expect(await fs.readLines(tmpFile)).to.be.deep.equal(["hello", "world"]);
        });
    });

    describe("Stat", () => {
        it("should return a `fs.Mode` instance with `new`", () => {
            const m = new fs.Mode({});
            expect(m instanceof fs.Mode).to.be.true();
        });

        it("should throw an Error if no `stat` object is passed in", () => {
            try {
                new fs.Mode();
                expect(false).to.be.true();
            } catch (e) {
                expect("You must pass in a \"stat\" object").to.be.equal(e.message);
            }
        });

        [{
            mode: 33188, /* 0100644 */
            octal: "0644",
            string: "-rw-r--r--",
            type: "file"
        }, {
            mode: 16877, /* 040755 */
            octal: "0755",
            string: "drwxr-xr-x",
            type: "directory"
        }, {
            mode: 16832, /* 040700 */
            octal: "0700",
            string: "drwx------",
            type: "directory"
        }, {
            mode: 41325, /* 0120555 */
            octal: "0555",
            string: "lr-xr-xr-x",
            type: "symbolicLink"
        }, {
            mode: 8592, /* 020620 */
            octal: "0620",
            string: "crw--w----",
            type: "characterDevice"
        }, {
            mode: 24960, /* 060600 */
            octal: "0600",
            string: "brw-------",
            type: "blockDevice"
        }, {
            mode: 4516, /* 010644 */
            octal: "0644",
            string: "prw-r--r--",
            type: "FIFO"
        }].forEach((test) => {
            const m = new fs.Mode(test);
            const isFn = `is${test.type[0].toUpperCase()}${test.type.substring(1)}`;
            const strMode = m.toString();
            const opposite = test.type === "file" ? "isDirectory" : "isFile";
            const first = test.type === "file" ? "d" : "-";
            describe(`input: 0${test.mode.toString(8)}`, () => {
                describe("#toString()", () => {
                    it(`should equal "${test.string}"`, () => {
                        expect(m.toString()).to.be.equal(test.string);
                    });
                });
                describe("#toOctal()", () => {
                    it(`should equal "${test.octal}"`, () => {
                        expect(m.toOctal()).to.be.equal(test.octal);
                    });
                });
                describe(`#${isFn}()`, () => {
                    it(`should return \`true\` for #${isFn}()`, () => {
                        expect(m[isFn]()).to.be.ok();
                    });
                    it(`should remain "${strMode}" after #${isFn}(true) (gh-2)`, () => {
                        expect(true).to.be.equal(m[isFn](true));
                        expect(strMode).to.be.equal(m.toString());
                    });
                });
                describe(`#${opposite}(true)`, () => {
                    it(`should return \`false\` for \`#${opposite}(true)\``, () => {
                        expect(false).to.be.equal(m[opposite](true));
                    });
                    it(`should be "${first}${m.toString().substring(1)}" after #${opposite}(true) (gh-2)`, () => {
                        expect(first + m.toString().substring(1)).to.be.equal(m.toString());
                    });
                });
            });
        });
    });
});
