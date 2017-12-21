const {
    is,
    stream: { concat }
} = adone;

describe("stream", "concat", () => {
    context("array", () => {
        it("should support arrays", async () => {
            const arrays = concat.create({ encoding: "array" });
            arrays.write([1, 2, 3]);
            arrays.write([4, 5, 6]);
            arrays.end();
            const out = await arrays;
            assert.deepEqual(out, [1, 2, 3, 4, 5, 6]);
        });
    });

    context("buffers", () => {
        it("should support buffers", async () => {
            const buffers = concat.create();
            buffers.write(Buffer.from("pizza Array is not a ", "utf8"));
            buffers.write(Buffer.from("stringy cat"));
            buffers.end();
            const out = await buffers;
            assert(is.buffer(out));
            assert.equal(out.toString("utf8"), "pizza Array is not a stringy cat");
        });

        specify("mixed writes", async () => {
            const buffers = concat.create();
            buffers.write(Buffer.from("pizza"));
            buffers.write(" Array is not a ");
            buffers.write([115, 116, 114, 105, 110, 103, 121]);
            const u8 = new Uint8Array(4);
            u8[0] = 32; u8[1] = 99; u8[2] = 97; u8[3] = 116;
            buffers.write(u8);
            buffers.write(555);
            buffers.end();
            const out = await buffers;
            assert(is.buffer(out));
            assert.equal(out.toString("utf8"), "pizza Array is not a stringy cat555");
        });
    });

    specify("type inference works as expected", () => {
        const stream = concat.create();
        assert.equal(stream.inferEncoding(["hello"]), "array", "array");
        assert.equal(stream.inferEncoding(Buffer.from("hello")), "buffer", "buffer");
        assert.equal(stream.inferEncoding(undefined), "buffer", "buffer");
        assert.equal(stream.inferEncoding(new Uint8Array(1)), "uint8array", "uint8array");
        assert.equal(stream.inferEncoding("hello"), "string", "string");
        assert.equal(stream.inferEncoding(""), "string", "string");
        assert.equal(stream.inferEncoding({ hello: "world" }), "object", "object");
        assert.equal(stream.inferEncoding(1), "buffer", "buffer");
    });

    context("objects", () => {
        it("should support objects", async () => {
            const stream = concat.create({ encoding: "objects" });
            stream.write({ foo: "bar" });
            stream.write({ baz: "taco" });
            stream.end();
            expect(await stream).to.be.deep.equal([
                { foo: "bar" },
                { baz: "taco" }
            ]);
        });

        it("should switch to objects encoding if no encoding specified and objects are written", async () => {
            const stream = concat.create();
            stream.write({ foo: "bar" });
            stream.write({ baz: "taco" });
            stream.end();
            expect(await stream).to.be.deep.equal([
                { foo: "bar" },
                { baz: "taco" }
            ]);
        });
    });

    context("string", () => {
        specify("string -> buffer", async () => {
            const strings = concat.create({ encoding: "buffer" });
            strings.write("nacho ");
            strings.write("dogs");
            strings.end();
            expect(await strings).to.be.deep.equal(Buffer.from("nacho dogs"));
        });

        specify("string stream", async () => {
            const strings = concat.create({ encoding: "string" });
            strings.write("nacho ");
            strings.write("dogs");
            strings.end();
            expect(await strings).to.be.equal("nacho dogs");
        });

        specify("end chunk", async () => {
            const strings = concat.create({ encoding: "string" });
            strings.write("this ");
            strings.write("is ");
            strings.end("the end");
            expect(await strings).to.be.equal("this is the end");
        });

        specify("string from mixed write encodings", async () => {
            const strings = concat.create({ encoding: "string" });
            strings.write("na");
            strings.write(Buffer.from("cho"));
            strings.write([32, 100]);
            const u8 = new Uint8Array(3);
            u8[0] = 111; u8[1] = 103; u8[2] = 115;
            strings.end(u8);
            expect(await strings).to.be.equal("nacho dogs");
        });

        specify("string from buffers with multibyte characters", async () => {
            const strings = concat.create({ encoding: "string" });
            const snowman = Buffer.from("☃");
            for (let i = 0; i < 8; i++) {
                strings.write(snowman.slice(0, 1));
                strings.write(snowman.slice(1));
            }
            strings.end();
            expect(await strings).to.be.equal("☃☃☃☃☃☃☃☃");
        });

        specify("string infer encoding with empty string chunk", async () => {
            const strings = concat.create();
            strings.write("");
            strings.write("nacho ");
            strings.write("dogs");
            strings.end();
            expect(await strings).to.be.equal("nacho dogs");
        });

        specify("to string numbers", async () => {
            const strings = concat.create();
            strings.write("a");
            strings.write(1000);
            strings.end();
            expect(await strings).to.be.equal("a1000");
        });
    });

    context("typed array", () => {
        it("should support typed arrays", async () => {
            const a = new Uint8Array(5);
            a[0] = 97; a[1] = 98; a[2] = 99; a[3] = 100; a[4] = 101;
            const b = new Uint8Array(3);
            b[0] = 32; b[1] = 102; b[2] = 103;
            const c = new Uint8Array(4);
            c[0] = 32; c[1] = 120; c[2] = 121; c[3] = 122;

            const arrays = concat.create({ encoding: "Uint8Array" });
            arrays.write(a);
            arrays.write(b);
            arrays.end(c);
            expect(Buffer.from(await arrays)).to.be.deep.equal(Buffer.from("abcde fg xyz"));
        });

        specify("typed array from strings, buffers, and arrays", async () => {
            const arrays = concat.create({ encoding: "Uint8Array" });
            arrays.write("abcde");
            arrays.write(Buffer.from(" fg "));
            arrays.end([120, 121, 122]);
            const out = await arrays;
            expect(out.subarray).to.be.a("function");
            expect(Buffer.from(out)).to.be.deep.equal(Buffer.from("abcde fg xyz"));
        });
    });
});
