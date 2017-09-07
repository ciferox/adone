describe("fast", "transform", "replace", () => {
    const { fast } = adone;
    const { File, Fast } = fast;

    const fixture = "Hello old world!\nHello new world!\nHello kind world!\nHello cruel world!";

    const expected = {
        helloperson: "Hello old person!\nHello new person!\nHello kind person!\nHello cruel person!",
        hellofarm: "Hello old cow!\nHello new chicken!\nHello kind duck!\nHello cruel person!",
        multreplace: "Hello dlo cow!\nHello new chicken!\nHello kind duck!\nHello cruel person!",
        multreplace2: "Hello dlo person!\nHello new person!\nHello kind person!\nHello cruel person!"
    };

    let replacements;
    let file;

    beforeEach(() => {
        replacements = [
            "cow",
            "chicken",
            "duck",
            "person"
        ];

        file = new File({
            path: "test/fixtures/helloworld.txt",
            contents: Buffer.from(fixture)
        });
    });

    describe("buffered input", () => {
        it("should replace string on a buffer", async () => {
            const [newFile] = await new Fast([file]).replace("world", "person");
            assert.equal(String(newFile.contents), expected.helloperson);
        });

        it("should replace regex on a buffer", async () => {
            const [newFile] = await new Fast([file]).replace(/world/g, "person");
            assert.equal(String(newFile.contents), expected.helloperson);
        });

        it("should replace regex on a buffer with a function", async () => {
            const [newFile] = await new Fast([file]).replace(/world/g, () => "person");
            assert.equal(String(newFile.contents), expected.helloperson);
        });

        it("should replace string on a buffer with a function", async () => {
            const [newFile] = await new Fast([file]).replace("world", () => "person");
            assert.equal(String(newFile.contents), expected.helloperson);
        });

        it("should call function once for each replacement when replacing a string on a buffer", async () => {
            const [newFile] = await new Fast([file]).replace("world", () => replacements.shift());
            assert.equal(String(newFile.contents), expected.hellofarm);
        });

        it("should call function once for each replacement when replacing a regex on a buffer", async () => {
            const [newFile] = await new Fast([file]).replace(/world/g, () => replacements.shift());
            assert.equal(String(newFile.contents), expected.hellofarm);
        });

        it("should replace in multiple files", async () => {
            const file1 = new File({
                contents: Buffer.from("Hello, World!")
            });
            const file2 = new File({
                contents: Buffer.from("Hello, Yell!")
            });
            const files = await new Fast([file1, file2]).replace({
                World: "Person",
                Yell: "Person"
            });
            expect(files).to.have.length(2);
            for (const file of files) {
                assert.equal(file.contents.toString(), "Hello, Person!");
            }
        });
    });

    describe("streamed input", () => {
        it("should throw an error", async () => {
            const file = new File({
                path: "test/fixtures/helloworld.txt",
                contents: new adone.std.stream.Stream.Readable()
            });

            await assert.throws(async () => {
                await new Fast([file]).replace("world", "person");
            });
        });
    });

    describe("multiple replacements", () => {
        it("should throw an error if first argument is array, but second aren't", () => {
            assert.throws(() => {
                new Fast([file]).replacereplace(["world"], "person");
            });
        });

        it("should throw an error if lengths didn't match", () => {
            assert.throws(() => {
                new Fast([file]).replace(["world"], ["person", "world"]);
            });
        });

        it("should replace by arrays", async () => {
            const [newFile] = await new Fast([file]).replace(["old", /world/g], ["dlo", () => replacements.shift()]);
            assert.equal(String(newFile.contents), expected.multreplace);
        });

        it("should replace by objects", async () => {
            const [newFile] = await new Fast([file]).replace({
                old: "dlo",
                world: "person"
            });
            assert.equal(String(newFile.contents), expected.multreplace2);
        });

        it("should properly replace cases with prefixes", async () => {
            const file = new File({
                contents: Buffer.from("$$ $$a $$b")
            });
            const [newFile] = await new Fast([file]).replace({
                $$: "hello",
                $$a: "world",
                $$b: "!"
            });
            assert.equal(newFile.contents.toString(), "hello world !");
        });

        it("should properly replace cases with suffixes", async () => {
            const file = new File({
                contents: Buffer.from("$$ a$$ b$$")
            });
            const [newFile] = await new Fast([file]).replace({
                $$: "hello",
                a$$: "world",
                b$$: "!"
            });
            assert.equal(newFile.contents.toString(), "hello world !");
        });
    });
});
