const {
    multiformat: { CID, multihash: mh },
    ipfs: { UnixFs, ipld: { Ipld: IPLD }, ipldInMemory: inMemory },
    stream: { pull }
} = adone;
const { values, collect } = pull;

const { srcPath } = require("./helpers");

const eachSeries = require("async").eachSeries;

const createBuilder = require(srcPath("builder"));
const FixedSizeChunker = require(srcPath("chunker/fixed-size"));

describe("builder", () => {
    let ipld;

    before((done) => {
        inMemory(IPLD, (err, resolver) => {
            expect(err).to.not.exist();

            ipld = resolver;

            done();
        });
    });

    const testMultihashes = Object.keys(mh.names).slice(1, 40);

    it("allows multihash hash algorithm to be specified", (done) => {
        eachSeries(testMultihashes, (hashAlg, cb) => {
            const options = { hashAlg, strategy: "flat" };
            const content = String(Math.random() + Date.now());
            const inputFile = {
                path: `${content}.txt`,
                content: Buffer.from(content)
            };

            const onCollected = (err, nodes) => {
                if (err) {
                    return cb(err);
                }

                const node = nodes[0];
                expect(node).to.exist();

                const cid = new CID(node.multihash);

                // Verify multihash has been encoded using hashAlg
                expect(mh.decode(cid.multihash).name).to.equal(hashAlg);

                // Fetch using hashAlg encoded multihash
                ipld.get(cid, (err, res) => {
                    if (err) {
                        return cb(err);
                    }
                    const content = UnixFs.unmarshal(res.value.data).data;
                    expect(content.equals(inputFile.content)).to.be.true();
                    cb();
                });
            };

            pull(
                values([Object.assign({}, inputFile)]),
                createBuilder(FixedSizeChunker, ipld, options),
                collect(onCollected)
            );
        }, done);
    });

    it("allows multihash hash algorithm to be specified for big file", function (done) {
        this.timeout(30000);

        eachSeries(testMultihashes, (hashAlg, cb) => {
            const options = { hashAlg, strategy: "flat" };
            const content = String(Math.random() + Date.now());
            const inputFile = {
                path: `${content}.txt`,
                // Bigger than maxChunkSize
                content: Buffer.alloc(262144 + 5).fill(1)
            };

            const onCollected = (err, nodes) => {
                if (err) {
                    return cb(err);
                }

                const node = nodes[0];

                try {
                    expect(node).to.exist();
                    const cid = new CID(node.multihash);
                    expect(mh.decode(cid.multihash).name).to.equal(hashAlg);
                } catch (err) {
                    return cb(err);
                }

                cb();
            };

            pull(
                values([Object.assign({}, inputFile)]),
                createBuilder(FixedSizeChunker, ipld, options),
                collect(onCollected)
            );
        }, done);
    });

    it("allows multihash hash algorithm to be specified for a directory", (done) => {
        eachSeries(testMultihashes, (hashAlg, cb) => {
            const options = { hashAlg, strategy: "flat" };
            const inputFile = {
                path: `${String(Math.random() + Date.now())}-dir`,
                content: null
            };

            const onCollected = (err, nodes) => {
                if (err) {
                    return cb(err);
                }

                const node = nodes[0];

                expect(node).to.exist();

                const cid = new CID(node.multihash);

                expect(mh.decode(cid.multihash).name).to.equal(hashAlg);

                // Fetch using hashAlg encoded multihash
                ipld.get(cid, (err, res) => {
                    if (err) {
                        return cb(err);
                    }
                    const meta = UnixFs.unmarshal(res.value.data);
                    expect(meta.type).to.equal("directory");
                    cb();
                });
            };

            pull(
                values([Object.assign({}, inputFile)]),
                createBuilder(FixedSizeChunker, ipld, options),
                collect(onCollected)
            );
        }, done);
    });
});
