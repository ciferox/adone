import generateFixtures from "./generate_fixtures";

describe("fast", "transform", "angular", "fileSort", () => {
    const { std: { path, fs }, fast } = adone;
    const { File, Stream } = fast;

    let root;

    before(async () => {
        root = await adone.fs.Directory.createTmp();
        await generateFixtures(root);
    });

    after(async () => {
        await root.unlink();
    });

    const fixture = (file, config) => {
        const filepath = path.join(root.path(), file);
        return new File({
            path: filepath,
            cwd: root.path(),
            base: root.path(),
            contents: config && config.withoutContents ? undefined : fs.readFileSync(filepath)
        });
    };


    it("should sort file with a module definition before files that uses it", async () => {
        const files = [
            fixture("another-factory.js"),
            fixture("another.js"),
            fixture("module-controller.js"),
            fixture("no-deps.js"),
            fixture("module.js"),
            fixture("dep-on-non-declared.js"),
            fixture("yet-another.js")
        ];

        const resultFiles = await new Stream(files).angularFilesort().map((x) => x.relative);
        expect(resultFiles.length).to.be.equal(7);
        expect(resultFiles.indexOf("module-controller.js")).to.be.above(resultFiles.indexOf("module.js"));
        expect(resultFiles.indexOf("yet-another.js")).to.be.above(resultFiles.indexOf("another.js"));
        expect(resultFiles.indexOf("another-factory.js")).to.be.above(resultFiles.indexOf("another.js"));
    });

    it("should sort files alphabetically when no ordering is required", async () => {
        const files = [
            fixture("module.js"),
            fixture("circular3.js"),
            fixture("module-controller.js"),
            fixture("circular.js"),
            fixture("circular2.js")
        ];

        const resultFiles = await new Stream(files).angularFilesort().map((x) => x.relative);
        expect(resultFiles.length).to.be.equal(5);
        expect(resultFiles.indexOf("module-controller.js")).to.be.above(resultFiles.indexOf("module.js"));
        expect(resultFiles.indexOf("module.js")).to.be.above(resultFiles.indexOf("circular.js"));
        expect(resultFiles.indexOf("circular3.js")).to.be.above(resultFiles.indexOf("circular2.js"));
        expect(resultFiles.indexOf("circular3.js")).to.be.above(resultFiles.indexOf("circular.js"));
    });

    it("should not crash when a module is both declared and used in the same file (Issue #5)", async () => {
        const files = [
            fixture("circular.js")
        ];

        const resultFiles = await new Stream(files).angularFilesort().map((x) => x.relative);
        expect(resultFiles.length).to.be.equal(1);
        expect(resultFiles[0]).to.be.equal("circular.js");
    });

    it("should not crash when a module is used inside a declaration even though it's before that module's declaration (Issue #7)", async () => {
        const files = [
            fixture("circular2.js"),
            fixture("circular3.js")
        ];

        const resultFiles = await new Stream(files).angularFilesort().map((x) => x.relative);

        expect(resultFiles.length).to.be.equal(2);
        expect(resultFiles).to.contain("circular2.js");
        expect(resultFiles).to.contain("circular3.js");
    });

    it("fails for not read file", async () => {
        const files = [
            fixture("fake.js", { withoutContents: true })
        ];

        await assert.throws(async () => {
            await new Stream(files).angularFilesort();
        });
    });

    it("does not fail for empty file", async () => {
        const files = [
            fixture("empty.js")
        ];

        const resultFiles = await new Stream(files).angularFilesort().map((x) => x.relative);
        expect(resultFiles).to.be.deep.equal(["empty.js"]);
    });

    describe("integration", () => {
        it("should sort files alphabetically when no ordering is required", async () => {
            const files = await fast.src(root.getFile("{module,circular3,module-controller,circular,circular2}.js").path())
                .angularFilesort();
            expect(files).to.have.lengthOf(5);
            const resultFiles = files.map((x) => x.basename);
            expect(resultFiles.indexOf("module-controller.js")).to.be.above(resultFiles.indexOf("module.js"));
            expect(resultFiles.indexOf("module.js")).to.be.above(resultFiles.indexOf("circular.js"));
            expect(resultFiles.indexOf("circular3.js")).to.be.above(resultFiles.indexOf("circular2.js"));
            expect(resultFiles.indexOf("circular3.js")).to.be.above(resultFiles.indexOf("circular.js"));
        });
    });
});
