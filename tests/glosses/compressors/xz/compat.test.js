import * as helpers from "./helpers";

const { std: { fs, path }, compressor: { xz } } = adone;

describe("glosses", "compressors", "xz", () => {
    function commonFixturePath(relPath) {
        return path.resolve(__dirname, "../..", "fixtures", relPath);
    }

    function fixturePath(relPath) {
        return path.join(__dirname, "fixtures", relPath);
    }

    describe("compress()/decompress() streams", () => {
        it("can compress", (done) => {
            const c = xz.compress.stream();

            c.on("finish", done);
            c.end("Hello!");
        });

        it("can round-trip", (done) => {
            const enc = xz.compress.stream();
            const dec = xz.decompress.stream();
            const outfile = fixturePath("random.lzma.unlzma");
            const outstream = helpers.fsCreateWriteStream(outfile);

            outstream.on("finish", () => {
                assert.isOk(helpers.bufferEqual(fs.readFileSync(commonFixturePath("small")), fs.readFileSync(outfile)));
                fs.unlink(outfile);
                done();
            });

            fs.createReadStream(commonFixturePath("small")).pipe(enc).pipe(dec).pipe(outstream);
        });
    });

    const BananasCompressed = "/Td6WFoAAAFpIt42AgAhARwAAAAQz1jMAQAGQmFuYW5hcwAA0aJr3wABGwcS69QXkEKZDQEAAAAAAVla";

    describe("xz.compress()/decompress()", () => {
        it("can round-trip", async () => {
            const a = await xz.compress("Bananas", { preset: 9 });
            assert.equal(a.toString("base64"), BananasCompressed);

            const b = await xz.decompress(a);
            assert.isOk(Buffer.isBuffer(b));
            assert.equal(b.toString(), "Bananas");
        });
    });
});
