const {
    stream: { pull },
    std: { os, path }
} = adone;
const { values, collect } = pull;

const loadFixture = require("../aegir/fixtures");
const isNode = require("detect-node");

const { srcPath } = require("./helpers");

const chunker = require(srcPath("chunker/rabin"));

const rawFile = loadFixture(path.join(__dirname, "fixtures/1MiB.txt"));

describe.todo("chunker: rabin", function () {
    this.timeout(30000);

    before(function () {
        if (os.platform() === "win32") {
            return this.skip();
        }

        if (!isNode) {
            this.skip();
        }
    });

    it("chunks non flat buffers", (done) => {
        const b1 = Buffer.alloc(2 * 256);
        const b2 = Buffer.alloc(1 * 256);
        const b3 = Buffer.alloc(5 * 256);

        b1.fill("a");
        b2.fill("b");
        b3.fill("c");

        pull(
            values([b1, b2, b3]),
            chunker({ minChunkSize: 48, avgChunkSize: 96, maxChunkSize: 192 }),
            collect((err, chunks) => {
                expect(err).to.not.exist();
                chunks.forEach((chunk) => {
                    expect(chunk).to.have.length.gte(48);
                    expect(chunk).to.have.length.lte(192);
                });
                done();
            })
        );
    });

    it("uses default min and max chunk size when only avgChunkSize is specified", (done) => {
        const b1 = Buffer.alloc(10 * 256);
        b1.fill("a");
        pull(
            values([b1]),
            chunker({ avgChunkSize: 256 }),
            collect((err, chunks) => {
                expect(err).to.not.exist();
                chunks.forEach((chunk) => {
                    expect(chunk).to.have.length.gte(256 / 3);
                    expect(chunk).to.have.length.lte(256 * (256 / 2));
                });
                done();
            })
        );
    });

    it("256 KiB avg chunks of non scalar filesize", (done) => {
        const KiB256 = 262144;
        const file = Buffer.concat([rawFile, Buffer.from("hello")]);
        const opts = {
            minChunkSize: KiB256 / 3,
            avgChunkSize: KiB256,
            maxChunkSize: KiB256 + (KiB256 / 2)
        };
        pull(
            values([file]),
            chunker(opts),
            collect((err, chunks) => {
                expect(err).to.not.exist();

                chunks.forEach((chunk) => {
                    expect(chunk).to.have.length.gte(opts.minChunkSize);
                    expect(chunk).to.have.length.lte(opts.maxChunkSize);
                });

                done();
            })
        );
    });
});
