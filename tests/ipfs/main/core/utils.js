const fromB58String = require("multihashes").fromB58String;

// This gets replaced by `create-repo-browser.js` in the browser
const createTempRepo = require("../utils/create_repo_nodejs.js");
const utils = require(adone.getPath("lib/ipfs/main/core/utils"));

const {
    ipfs: { IPFS },
    std: { fs, path }
} = adone;

const fixturePath = (...args) => path.join(__dirname, "..", "fixtures", ...args);


describe("utils", () => {
    const rootHash = "QmTAMavb995EHErSrKo7mB8dYkpaSJxu6ys1a6XJyB2sys";
    const rootPath = `/ipfs/${rootHash}`;
    const rootMultihash = fromB58String(rootHash);
    const aboutHash = "QmbJCNKXJqVK8CzbjpNFz2YekHwh3CSHpBA86uqYg3sJ8q";
    const aboutPath = `${rootPath}/mercury`;
    const aboutMultihash = fromB58String(aboutHash);

    describe("parseIpfsPath", () => {
        it("parses path with no links", () => {
            expect(utils.parseIpfsPath(rootHash))
                .to.deep.equal({
                    hash: rootHash,
                    links: []
                });
        });

        it("parses path with links", () => {
            expect(utils.parseIpfsPath(`${rootHash}/docs/index`))
                .to.deep.equal({
                    hash: rootHash,
                    links: ["docs", "index"]
                });
        });

        it("parses path with /ipfs/ prefix", () => {
            expect(utils.parseIpfsPath(`/ipfs/${rootHash}/about`))
                .to.deep.equal({
                    hash: rootHash,
                    links: ["about"]
                });
        });

        it("parses path with leading and trailing slashes", () => {
            expect(utils.parseIpfsPath(`/${rootHash}/`))
                .to.deep.equal({
                    hash: rootHash,
                    links: []
                });
        });

        it("normalize path with no ipfs path, nor ipns path nor cid should throw an exception", () => {
            try {
                utils.normalizePath(`/${rootHash}/`);
            } catch (err) {
                expect(err).to.exist();
            }
        });

        it("normalize path should return an ipfs path, when an ipfs path is provided", () => {
            const ipfsPath = `/ipfs/${rootHash}`;
            expect(utils.normalizePath(ipfsPath))
                .to.equal(ipfsPath);
        });

        it("normalize path should return an ipfs path, when a cid is provided", () => {
            const ipfsPath = `/ipfs/${rootHash}`;
            expect(utils.normalizePath(rootHash))
                .to.equal(ipfsPath);
        });

        it("normalize path should return an ipns path, when an ipns path is provided", () => {
            const ipnsPath = `/ipns/${rootHash}`;
            expect(utils.normalizePath(ipnsPath))
                .to.equal(ipnsPath);
        });

        it("parses non sha2-256 paths", () => {
            // There are many, many hashing algorithms. Just one should be a sufficient
            // indicator. Used go-ipfs@0.4.13 `add --hash=keccak-512` to generate
            const keccak512 = "zB7S6ZdcqsTqvNhBpx3SbFTocRpAUHj1w9WQXQGyWBVEsLStNfaaNtsdFUQbRk4tYPZvnpGbtDN5gEH4uVzUwsFyJh9Ei";
            expect(utils.parseIpfsPath(keccak512))
                .to.deep.equal({
                    hash: keccak512,
                    links: []
                });
        });

        it("returns error for malformed path", () => {
            const fn = () => utils.parseIpfsPath(`${rootHash}//about`);
            expect(fn).to.throw("invalid ipfs ref path");
        });

        it("returns error if root is not a valid sha2-256 multihash", () => {
            const fn = () => utils.parseIpfsPath("invalid/ipfs/path");
            expect(fn).to.throw("invalid ipfs ref path");
        });
    });

    describe("resolvePath", function () {
        this.timeout(100 * 1000);
        const fixtures = [
            fixturePath("planets/mercury/wiki.md"),
            fixturePath("planets/solar-system.md")
        ].map((path) => ({
            path,
            content: fs.readFileSync(path)
        }));

        let node;
        let repo;

        before((done) => {
            repo = createTempRepo();
            node = new IPFS({
                repo,
                config: {
                    Bootstrap: []
                }
            });
            node.once("ready", () => node.add(fixtures, done));
        });

        after((done) => node.stop(done));

        after((done) => repo.teardown(done));

        it("handles base58 hash format", (done) => {
            utils.resolvePath(node.object, rootHash, (err, hashes) => {
                expect(err).to.not.exist();
                expect(hashes.length).to.equal(1);
                expect(hashes[0]).to.deep.equal(rootMultihash);
                done();
            });
        });

        it("handles multihash format", (done) => {
            utils.resolvePath(node.object, aboutMultihash, (err, hashes) => {
                expect(err).to.not.exist();
                expect(hashes.length).to.equal(1);
                expect(hashes[0]).to.deep.equal(aboutMultihash);
                done();
            });
        });

        it("handles ipfs paths format", function (done) {
            this.timeout(200 * 1000);
            utils.resolvePath(node.object, aboutPath, (err, hashes) => {
                expect(err).to.not.exist();
                expect(hashes.length).to.equal(1);
                expect(hashes[0]).to.deep.equal(aboutMultihash);
                done();
            });
        });

        it("handles an array", (done) => {
            const paths = [rootHash, rootPath, rootMultihash];
            utils.resolvePath(node.object, paths, (err, hashes) => {
                expect(err).to.not.exist();
                expect(hashes.length).to.equal(3);
                expect(hashes[0]).to.deep.equal(rootMultihash);
                expect(hashes[1]).to.deep.equal(rootMultihash);
                expect(hashes[2]).to.deep.equal(rootMultihash);
                done();
            });
        });

        it("should error on invalid hashes", (done) => {
            utils.resolvePath(node.object, "/ipfs/asdlkjahsdfkjahsdfd", (err) => {
                expect(err).to.exist();
                done();
            });
        });

        it("should error when a link doesn't exist", (done) => {
            utils.resolvePath(node.object, `${aboutPath}/fusion`, (err) => {
                expect(err.message).to.include(
                    "no link named \"fusion\" under QmbJCNKXJqVK8CzbjpNFz2YekHwh3CSHpBA86uqYg3sJ8q"
                );
                done();
            });
        });
    });
});
