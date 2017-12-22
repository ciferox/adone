describe("fast", "transform", "useref", () => {
    const { fast, std: { path, fs } } = adone;
    const { File, Stream } = fast;

    const P = (p) => p.split("/").join(path.sep);

    let fromdir;
    let root;

    before(async () => {
        root = await adone.fs.Directory.createTmp();
    });

    after(async () => {
        await root.unlink();
    });

    beforeEach(async () => {
        fromdir = await root.addDirectory("from");
    });

    afterEach(async () => {
        await root.clean();
    });

    it("file should pass through", async () => {
        const fakeFile = new File({
            path: P("test/fixture/file.js"),
            cwd: P("test"),
            base: P("test/fixture/"),
            contents: Buffer.from("wadup();")
        });

        const files = await new Stream([fakeFile]).useref();
        expect(files).to.have.length(1);
        const [file] = files;
        expect(file.contents).to.be.ok();
        expect(file.path).to.be.equal(P("test/fixture/file.js"));
        expect(file.relative).to.be.equal("file.js");
    });

    it("should emit error on streamed file", async () => {
        const f = await fromdir.addFile("hello.js");
        const file = new File({
            path: "hello.js",
            contents: fs.createReadStream(f.path())
        });
        try {
            await assert.throws(async () => {
                await new Stream([file]).useref();
            });
        } finally {
            file.contents.close();
        }
    });

    it("should replace reference in css block and return replaced files", async () => {
        await fromdir.addFile("index.html", {
            contents: [
                "<html>",
                "    <head>",
                "        <!-- build:css /css/combined.css -->",
                "        <link href=\"/css/one.css\" rel=\"stylesheet\">",
                "        <link href=\"/css/two.css\" rel=\"stylesheet\">",
                "        <!-- endbuild -->",
                "    </head>",
                "</html>"
            ].join("\n")
        });
        const [file] = await fast.src(fromdir.getFile("index.html").path()).useref();
        expect(file.contents.toString()).to.be.equal([
            "<html>",
            "    <head>",
            "        <link rel=\"stylesheet\" href=\"/css/combined.css\">",
            "    </head>",
            "</html>"
        ].join("\n"));
    });
});
