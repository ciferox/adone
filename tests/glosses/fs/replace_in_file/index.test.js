const {
    assertion,
    fs: { replaceInFile, writeFile, mkdirp, rm },
    std: { fs, path: { join } }
} = adone;

assertion.use(assertion.extension.promise);

describe("fs", "replaceInfFile", () => {
    const testData = "a re place c";

    const fixture = (...args) => join(__dirname, "fixtures", ...args);

    beforeEach(async () => {
        await mkdirp(fixture());
        await writeFile(fixture("test1"), testData, "utf8");
        await writeFile(fixture("test2"), testData, "utf8");
        await writeFile(fixture("test3"), "nope", "utf8");
    });

    afterEach(async () => {
        await rm(fixture());
    });

    it("should throw an error when no config provided", () => {
        return expect(replaceInFile()).to.eventually.be.rejectedWith(Error);
    });

    it("should throw an error when invalid config provided", () => {
        return expect(replaceInFile(42)).to.eventually.be.rejectedWith(Error);
    });

    it("should throw an error when no `files` defined", () => {
        return expect(replaceInFile({
            from: /re\splace/g,
            to: "b"
        })).to.eventually.be.rejectedWith(Error);
    });

    it("should throw an error when no `from` defined", () => {
        return expect(replaceInFile({
            files: fixture("test1"),
            to: "b"
        })).to.eventually.be.rejectedWith(Error);
    });

    it("should throw an error when no `to` defined", () => {
        return expect(replaceInFile({
            files: fixture("test1"),
            from: /re\splace/g
        })).to.eventually.be.rejectedWith(Error);
    });

    it("should throw an error when invalid `glob` config defined", () => {
        return expect(replaceInFile({
            files: fixture("test1"),
            from: /re\splace/g,
            to: "test",
            glob: "invalid"
        })).to.eventually.be.rejectedWith(Error);
    });

    it("should replace contents in a single file with regex", async () => {
        await replaceInFile({
            files: fixture("test1"),
            from: /re\splace/g,
            to: "b"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b c");
        expect(test2).to.equal(testData);
    });

    it('should pass file as an arg to a "from" function', async () => {
        await replaceInFile({
            files: fixture("test1"),
            from: (file) => {
                expect(file).to.equal(fixture("test1"));
                return /re\splace/g;
            },
            to: "b"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b c");
        expect(test2).to.equal(testData);
    });

    it("should pass the match as first arg and file as last arg to a replacer function replace contents in a single file with regex", async () => {
        await replaceInFile({
            files: fixture("test1"),
            from: /re\splace/g,
            to: (match, ...args) => {
                const file = args.pop();
                expect(match).to.equal("re place");
                expect(file).to.equal(fixture("test1"));
                return "b";
            }
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b c");
        expect(test2).to.equal(testData);
    });

    it("should replace contents with a string replacement", async () => {
        await replaceInFile({
            files: fixture("test1"),
            from: "re place",
            to: "b"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal("a b c");
    });

    it("should pass the match as first arg and file as last arg to a replacer function and replace contents with a string replacement", async () => {
        await replaceInFile({
            files: fixture("test1"),
            from: "re place",
            to: (match, ...args) => {
                const file = args.pop();
                expect(match).to.equal("re place");
                expect(file).to.equal(fixture("test1"));
                return "b";
            }
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal("a b c");

    });

    it("should replace contents in a an array of files", async () => {
        await replaceInFile({
            files: [fixture("test1"), fixture("test2")],
            from: /re\splace/g,
            to: "b"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b c");
        expect(test2).to.equal("a b c");
    });

    it("should expand globs", async () => {
        await replaceInFile({
            files: fixture("test*"),
            from: /re\splace/g,
            to: "b"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b c");
        expect(test2).to.equal("a b c");
    });

    it("should expand globs while excluding ignored files", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: "test*",
            ignore: "test1",
            from: /re\splace/g,
            to: "b"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a re place c");
        expect(test2).to.equal("a b c");
    });

    it("should replace substrings", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /(re)\s(place)/g,
            to: "$2 $1"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal("a place re c");
    });

    it("should fulfill the promise on success", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /re\splace/g,
            to: "b"
        });
    });

    it("should reject the promise with an error on failure", () => {
        return expect(replaceInFile({
            cwd: fixture(),
            files: "nope",
            from: /re\splace/g,
            to: "b"
        })).to.eventually.be.rejectedWith(Error);
    });

    it("should not reject the promise if allowEmptyPaths is true", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: "nope",
            allowEmptyPaths: true,
            from: /re\splace/g,
            to: "b"
        });
    });

    it("should return a changed files array", async () => {
        const changedFiles = await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /re\splace/g,
            to: "b"
        });
        expect(changedFiles).to.be.instanceof(Array);
    });

    it("should return in files if something was replaced", async () => {
        const changedFiles = await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /re\splace/g,
            to: "b"
        });
        expect(changedFiles).to.have.length(1);
        expect(changedFiles[0]).to.equal("test1");
    });

    it("should not return in files if nothing replaced", async () => {
        const changedFiles = await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: "nope",
            to: "b"
        });
        expect(changedFiles).to.have.length(0);
    });

    it("should return changed files for multiple files", async () => {
        const changedFiles = await replaceInFile({
            cwd: fixture(),
            files: ["test1", "test2", "test3"],
            from: /re\splace/g,
            to: "b"
        });
        expect(changedFiles).to.have.length(2);
        expect(changedFiles).to.contain("test1");
        expect(changedFiles).to.contain("test2");
    });

    it("should make multiple replacements with the same string", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: ["test1", "test2", "test3"],
            from: [/re/g, /place/g],
            to: "b"
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b b c");
        expect(test2).to.equal("a b b c");
    });

    it("should make multiple replacements with different strings", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: ["test1", "test2", "test3"],
            from: [/re/g, /place/g],
            to: ["b", "e"]
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b e c");
        expect(test2).to.equal("a b e c");
    });

    it("should not replace with missing replacement values", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: ["test1", "test2", "test3"],
            from: [/re/g, /place/g],
            to: ["b"]
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a b place c");
        expect(test2).to.equal("a b place c");
    });

    it("should not replace in a dry run", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: ["test1", "test2"],
            from: /re\splace/g,
            to: "b",
            dry: true
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        const test2 = fs.readFileSync(fixture("test2"), "utf8");
        expect(test1).to.equal("a re place c");
        expect(test2).to.equal("a re place c");
    });

    it("should return changed files for a dry run", async () => {
        const changedFiles = await replaceInFile({
            cwd: fixture(),
            files: ["test1", "test2", "test3"],
            from: /re\splace/g,
            to: "b",
            dry: true
        });
        expect(changedFiles).to.have.length(2);
        expect(changedFiles).to.contain("test1");
        expect(changedFiles).to.contain("test2");
    });

    it("should accept glob configuration", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /re\splace/g,
            to: "b",
            allowEmptyPaths: true,
            glob: {
                ignore: ["test1"]
            }
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal("a re place c");
    });

    it("should ignore empty glob configuration", async () => {
        await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /re\splace/g,
            to: "b",
            glob: null
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal("a b c");
    });

    it("should backup if backupPath is specified", async () => {
        const backupPath = await adone.fs.tmpName();
        await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /re\splace/g,
            to: "b",
            backupPath
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal("a b c");
        expect(fs.readFileSync(join(backupPath, "test1"), "utf8")).to.be.equal(testData);
        await adone.fs.rm(backupPath);
    });

    it("should create backup directory is not exists", async () => {
        const backupPath = await adone.fs.tmpName();
        await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /re\splace/g,
            to: "b",
            backupPath: join(backupPath, "a", "B", "c")
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal("a b c");
        expect(fs.readFileSync(join(join(backupPath, "a", "B", "c"), "test1"), "utf8")).to.be.equal(testData);
        await adone.fs.rm(backupPath);
    });

    it("should not backup if content is not replaced", async () => {
        const backupPath = await adone.fs.tmpName();
        await replaceInFile({
            cwd: fixture(),
            files: "test1",
            from: /c e/g,
            to: "b",
            backupPath
        });
        const test1 = fs.readFileSync(fixture("test1"), "utf8");
        expect(test1).to.equal(testData);
        assert.isFalse(await adone.fs.exists(join(backupPath, "test1")));
        await adone.fs.rm(backupPath);
    });
});
