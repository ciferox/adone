import * as helpers from "./helpers";

const { is, std: { fs, path }, compressor: { xz } } = adone;

describe("compressor", "xz", () => {
    const commonFixturePath = (relPath) => path.resolve(__dirname, "../..", "fixtures", relPath);

    const fixture = (name) => path.join(__dirname, "fixtures", name);

    describe("compress()/decompress() streams", () => {
        it("can compress", (done) => {
            const c = xz.compressStream();

            c.on("finish", done);
            c.end("Hello!");
        });

        it("can round-trip", (done) => {
            const enc = xz.compressStream();
            const dec = xz.decompressStream();
            const outfile = fixture("random.lzma.unlzma");
            const outstream = helpers.fsCreateWriteStream(outfile);

            outstream.on("finish", () => {
                assert.ok(helpers.bufferEqual(fs.readFileSync(commonFixturePath("small")), fs.readFileSync(outfile)));
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
            assert.ok(is.buffer(b));
            assert.equal(b.toString(), "Bananas");
        });
    });
});
