const {
    stream: { pull: { pipe } }
} = adone;

const randomBytes = require("random-bytes");
const { tap, consume, collect } = require("streaming-iterables");

const srcPath = (...args) => adone.getPath("src/glosses/p2p/muxers/mplex", ...args);
const restrictSize = require(srcPath("restrict_size"));

describe("restrict-size", () => {
    it("should throw when size is too big", async () => {
        const maxSize = 32;

        const input = [
            { data: await randomBytes(8) },
            { data: await randomBytes(maxSize) },
            { data: await randomBytes(64) },
            { data: await randomBytes(16) }
        ];

        const output = [];

        try {
            await pipe(
                input,
                restrictSize(maxSize),
                tap((chunk) => output.push(chunk)),
                consume
            );
        } catch (err) {
            expect(err.code).to.equal("ERR_MSG_TOO_BIG");
            expect(output).to.have.length(2);
            expect(output[0]).to.deep.equal(input[0]);
            expect(output[1]).to.deep.equal(input[1]);
            return;
        }
        throw new Error("did not restrict size");
    });

    it("should allow message with no data property", async () => {
        const output = await pipe(
            [{}],
            restrictSize(32),
            collect
        );
        expect(output).to.deep.equal([{}]);
    });
});
