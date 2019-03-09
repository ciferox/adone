describe("fast", "transform", "wrap", () => {
    const { fast, stream } = adone;
    const { File, Stream } = fast;

    it("should pass an empty file as it is", async () => {
        const [file] = await new Stream([new File({})]).wrap("");
        expect(file.isNull()).to.be.true();
    });

    it("should produce expected file via buffer", async () => {
        const [file] = await new Stream([new File({ contents: Buffer.from("foo") })]).wrap("<%= contents %>bar");
        expect(file.isBuffer()).to.be.true();
        expect(String(file.contents)).to.be.equal("foobar");
    });

    it("should produce expected file via stream", async () => {
        const s = new adone.std.stream.PassThrough().pause();
        s.end(Buffer.from("b"));
        const [file] = await new Stream([new File({ contents: s })]).wrap("a<%= contents %>c");
        expect(file.isStream()).to.be.true();
        const data = await file.contents.pipe(stream.concat.create());
        expect(String(data)).to.be.equal("abc");
    });

    it("should error when no template is provided", () => {
        assert.throws(() => {
            new Stream().wrap(null);
        });
    });

    it("should handle a template from a file", async () => {
        const file = await FS.createTempFile();
        await file.write("BEFORE <%= contents %> AFTER");
        const [data] = await new Stream([new File({ contents: Buffer.from("Hello") })]).wrap({ src: file.path() });
        expect(data.isBuffer()).to.be.true();
        expect(String(data.contents)).to.be.equal("BEFORE Hello AFTER");
    });

    it("should handle a template from a function", async () => {
        const [file] = await new Stream([new File({ contents: Buffer.from("Hello") })]).wrap(() => "BEFORE <%= contents %> AFTER");
        expect(file.isBuffer()).to.be.true();
        expect(String(file.contents)).to.be.equal("BEFORE Hello AFTER");
    });

    it("should fail when it cannot read the template file.", async () => {
        await assert.throws(async () => {
            await new Stream([new File({ contents: Buffer.from("Hello") })]).wrap({ src: "something_that_doesnt_exist" });
        });
    });

    it("should handle template data and options", async () => {
        const [file] = await new Stream([new File({ contents: Buffer.from("Hello") })])
            .wrap(
                "BEFORE <%= data.contents %> <%= data.someVar %> AFTER",
                { someVar: "someVal" },
                { variable: "data" }
            );
        expect(file.isBuffer()).to.be.true();
        expect(String(file.contents)).to.be.equal("BEFORE Hello someVal AFTER");
    });

    it("should allow for dynamic options", async () => {
        const srcFile = new File({ contents: Buffer.from("Hello") });
        srcFile.dataProp = "data";
        const [file] = await new Stream([srcFile])
            .wrap(
                "BEFORE <%= data.contents %> <%= data.someVar %> AFTER",
                { someVar: "someVal" },
                (file) => {
                    return { variable: file.dataProp };
                }
            );
        expect(file.isBuffer()).to.be.true();
        expect(String(file.contents)).to.be.equal("BEFORE Hello someVal AFTER");
    });

    it("should allow file props in the template data", async () => {
        const srcFile = new File({ contents: Buffer.from("Hello") });
        srcFile.someProp = "someValue";
        const [file] = await new Stream([srcFile])
            .wrap("Contents: [<%= contents %>] - File prop: [<%= file.someProp %>]");
        expect(file.isBuffer());
        expect(String(file.contents)).to.be.equal("Contents: [Hello] - File prop: [someValue]");
    });

    it("should make data props override file data", async () => {
        const srcFile = new File({ contents: Buffer.from("Hello") });
        srcFile.someProp = "bar";
        const [file] = await new Stream([srcFile])
            .wrap("<%= contents %> - <%= file.someProp %>", {
                file: { someProp: "foo" }
            });
        expect(file.isBuffer()).to.be.ok();
        expect(String(file.contents)).to.be.equal("Hello - foo");
    });

    it("should allow for dynamic data", async () => {
        const srcFile = new File({ contents: Buffer.from("Hello") });
        srcFile.someProp = "bar";
        const [file] = await new Stream([srcFile])
            .wrap("<%= contents %> - <%= file.someProp %>", (file) => {
                return {
                    file: { someProp: `foo-${file.someProp}` }
                };
            });
        expect(file.isBuffer()).to.be.ok();
        expect(String(file.contents)).to.be.equal("Hello - foo-bar");
    });

    it("should not pollute file data across multiple streams", async () => {
        const srcFile1 = new File({ contents: Buffer.from("1") });
        srcFile1.foo = "one";

        const srcFile2 = new File({ contents: Buffer.from("2") });
        srcFile2.bar = "two";

        const expected = ["one  1", "two  2"];

        const files = await new Stream([srcFile1, srcFile2])
            .wrap("<%= file.one %> <%= file.two %> <%= contents %>")
            .forEach((file) => {
                expect(file.isBuffer()).to.be.ok();
                expect(String(file.contents), expected.shift()).to.be.ok();
            }, { passthrough: true });
        expect(files).to.have.length(2);
    });

    it("should merge file.data property", async () => {
        const srcFile = new File({ contents: Buffer.from("Hello") });
        srcFile.data = { prop: "foo" };
        const [file] = await new Stream([srcFile]).wrap("<%= contents %> <%= prop %>");
        expect(file.isBuffer()).to.be.ok();
        expect(String(file.contents)).to.be.equal("Hello foo");
    });

    it("should allow for expressions", async () => {
        const srcFile = new File({
            path: "test/fixtures/hello.txt",
            contents: Buffer.from("Hello")
        });
        const [file] = await new Stream([srcFile])
            .wrap("<%= path.dirname(file.path) %>", {
                file: { path: "a/b" }
            }, {
                imports: {
                    path: adone.std.path
                }
            });
        expect(file.isBuffer()).to.be.ok();
        expect(String(file.contents)).to.be.equal("a");
    });

    it("should parse JSON files by default", async () => {
        const srcFile = new File({
            path: "data.json",
            contents: Buffer.from("{\"name\": \"foo\"}")
        });
        const [file] = await new Stream([srcFile]).wrap("BEFORE <%= contents.name %> AFTER");
        expect(file.isBuffer()).to.be.ok();
        expect(String(file.contents)).to.be.equal("BEFORE foo AFTER");
    });

    it("should parse JSON5 files by default", async () => {
        const srcFile = new File({
            path: "data.json5",
            contents: Buffer.from("{ name: Infinity }")
        });
        const [file] = await new Stream([srcFile]).wrap("BEFORE <%= contents.name %> AFTER");
        expect(file.isBuffer()).to.be.ok();
        expect(String(file.contents)).to.be.equal("BEFORE Infinity AFTER");
    });

    it("option parse=false should disable file parsing", async () => {
        const srcFile = new File({
            path: "data.yml",
            contents: Buffer.from("name: foo")
        });
        const [file] = await new Stream([srcFile]).wrap("<%= contents %>", null, { parse: false });
        expect(file.isBuffer()).to.be.ok();
        expect(String(file.contents)).to.be.equal("name: foo");
    });

    it("should throw error object passed for template and no src property is set", () => {
        assert.throws(() => {
            new Stream().wrap({});
        }, "Expecting `src` option");
    });

    it("should throw error if data file parse is invalid", async () => {
        const srcFile = new File({
            path: "data.json",
            contents: Buffer.from("This is an invalid JSON file.")
        });
        await assert.throws(async () => {
            await new Stream([srcFile]).wrap("<%= contents %>");
        }, "Error parsing: data.json");
    });

    it("should throw error if template is invalid", async () => {
        const srcFile = new File({
            path: "data.json",
            contents: Buffer.from("{\"name\": \"foo\"}")
        });
        await assert.throws(async () => {
            await new Stream([srcFile]).wrap("<%= contents.does.not.exist %>");
        }, "Cannot read property 'not' of undefined");
    });

    describe("integration", () => {
        let fromdir;
        let root;
        let srcPath;

        before(async () => {
            root = await adone.fs.Directory.createTmp();
        });

        after(async () => {
            await root.unlink();
        });

        beforeEach(async () => {
            fromdir = await root.addDirectory("from");
            srcPath = fromdir.getFile("**", "*.js").path();
        });

        afterEach(async () => {
            await root.clean();
        });

        it("should wrap", async () => {
            await fromdir.addFile("hello.js", {
                contents: "console.log(123);"
            });
            await fast.src(srcPath).wrap("function() { <%= file.contents %> }").map((file) => {
                expect(file.contents.toString()).to.be.equal("function() { console.log(123); }");
                return file;
            });
        });

        it("should support variables", async () => {
            await fromdir.addFile("hello.js", {
                contents: "console.log(123);"
            });
            await fast.src(srcPath)
                .wrap("function() { <%= file.contents %> } <%= a %>", { a: 123 })
                .map((file) => {
                    expect(file.contents.toString()).to.be.equal("function() { console.log(123); } 123");
                    return file;
                });
        });

        it("should support custom variable names", async () => {
            await fromdir.addFile("hello.js", {
                contents: "console.log(123);"
            });
            await fast.src(srcPath)
                .wrap("function() { <%= d.file.contents %> } <%= d.a %>", { a: 123 }, { variable: "d" })
                .map((file) => {
                    expect(file.contents.toString()).to.be.equal("function() { console.log(123); } 123");
                    return file;
                });
        });
    });
});
