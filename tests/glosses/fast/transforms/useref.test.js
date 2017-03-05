const { fast, std: { path, fs } } = adone;

const { File, plugin: { useref } } = fast;

describe("Fast", () => {
    describe("transforms", () => {
        describe("useref", () => {
            function P(p) {
                return p.split("/").join(path.sep);
            }

            let fromdir;
            let root;

            before(async () => {
                root = await FS.createTempDirectory();
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

            it("file should pass through", function (done) {
                let a = 0;

                const fakeFile = new File({
                    path: P("test/fixture/file.js"),
                    cwd: P("test"),
                    base: P("test/fixture/"),
                    contents: new Buffer("wadup();")
                });

                const stream = useref();
                stream.on("data", function (file) {
                    expect(file.contents).to.be.ok;
                    expect(file.path).to.be.equal(P("test/fixture/file.js"));
                    expect(file.relative).to.be.equal("file.js");
                    ++a;
                });

                stream.once("end", function () {
                    expect(a).to.be.equal(1);
                    done();
                });

                stream.write(fakeFile);
                stream.end();
                stream.resume();
            });

            it("should emit error on streamed file", (done) => {
                fromdir.addFile("hello.js").then((file) => {
                    const stream = useref();
                    const fstream = fs.createReadStream(file.path()); 
                    stream.on("error", () => {
                        fstream.close(); 
                        done(); 
                    });
                    stream.write(new File({
                        path: "hello.js",
                        contents: fstream
                    }));
                });
            });

            it("should replace reference in css block and return replaced files", async () => {
                await fromdir.addFile("index.html", {
                    content: [
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
                const [file] = await fast.src(fromdir.getVirtualFile("index.html").path()).useref();
                expect(file.contents.toString()).to.be.equal([
                    "<html>",
                    "    <head>",
                    "        <link rel=\"stylesheet\" href=\"/css/combined.css\">",
                    "    </head>",
                    "</html>"
                ].join("\n"));
            });
        });
    });
});
