const {
    multiformat: { CID },
    ipfs: { ipld: { Ipld: IPLD }, ipldInMemory: inMemory },
    stream: { pull }
} = adone;
const { values, collect } = pull;

const { srcPath } = require("./helpers");

const createBuilder = require(srcPath("builder"));
const FixedSizeChunker = require(srcPath("chunker/fixed-size"));

describe("builder: onlyHash", () => {
    let ipld;

    before((done) => {
        inMemory(IPLD, (err, resolver) => {
            expect(err).to.not.exist();

            ipld = resolver;

            done();
        });
    });

    it('will only chunk and hash if passed an "onlyHash" option', (done) => {
        const onCollected = (err, nodes) => {
            if (err) {
                return done(err);
            }

            const node = nodes[0];
            expect(node).to.exist();

            ipld.get(new CID(node.multihash), (err, res) => {
                expect(err).to.exist();
                done();
            });
        };

        const content = String(Math.random() + Date.now());
        const inputFile = {
            path: `${content}.txt`,
            content: Buffer.from(content)
        };

        const options = {
            onlyHash: true
        };

        pull(
            values([inputFile]),
            createBuilder(FixedSizeChunker, ipld, options),
            collect(onCollected)
        );
    });
});
