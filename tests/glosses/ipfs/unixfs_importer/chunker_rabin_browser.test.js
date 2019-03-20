const {
    stream: { pull }
} = adone;
const { values, collect } = pull;
const isNode = require("detect-node");

const { srcPath } = require("./helpers");

const chunker = require(srcPath("chunker/rabin"));


describe.skip("chunker: rabin browser", () => {
    before(function () {
        if (isNode) {
            this.skip();
        }
    });

    it("returns an error", (done) => {
        const b1 = Buffer.alloc(2 * 256);
        const b2 = Buffer.alloc(1 * 256);
        const b3 = Buffer.alloc(5 * 256);

        b1.fill("a");
        b2.fill("b");
        b3.fill("c");

        pull(
            values([b1, b2, b3]),
            chunker({ minChunkSize: 48, avgChunkSize: 96, maxChunkSize: 192 }),
            collect((err) => {
                expect(err).to.exist();
                expect(err.message).to.include("Rabin chunker not available");

                done();
            })
        );
    });
});
