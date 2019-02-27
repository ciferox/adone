const {
    std: { fs, path }
} = adone;

const isNode = require("detect-node");
const flatten = require(path.join(adone.ROOT_PATH, "lib/ipfs/ipfsd_ctl/utils/flatten"));
const tempDir = require(path.join(adone.ROOT_PATH, "lib/ipfs/ipfsd_ctl/utils/tmp-dir"));
const findIpfsExecutable = require(path.join(adone.ROOT_PATH, "lib/ipfs/ipfsd_ctl/utils/find_ipfs_executable"));

describe("utils", () => {
    describe(".flatten", () => {
        it("should flatten", () => {
            expect(flatten({ a: { b: { c: [1, 2, 3] } } }))
                .to.eql({ "a.b.c": [1, 2, 3] });
        });

        it("should handle nulls", () => {
            expect(flatten(null)).to.eql({});
        });

        it("should handle undefined", () => {
            expect(flatten(undefined)).to.eql({});
        });
    });

    describe(".tempDir", () => {
        it("should create tmp directory path for go-ipfs", () => {
            const tmpDir = tempDir();
            expect(tmpDir).to.exist();
            expect(tmpDir).to.include("ipfs_");
        });

        it("should create tmp directory path for js-ipfs", () => {
            const tmpDir = tempDir(true);
            expect(tmpDir).to.exist();
            expect(tmpDir).to.include("jsipfs_");
        });
    });

    if (isNode) {
        describe(".findIpfsExecutable", () => {
            it("should find go executable", () => {
                const execPath = findIpfsExecutable("go");
                expect(execPath).to.exist();
                expect(execPath).to.include(path.join("opt", "go-ipfs", "ipfs"));
                expect(fs.existsSync(execPath)).to.be.ok();
            });

            it("should find js executable", () => {
                const execPath = findIpfsExecutable("js");
                expect(execPath).to.exist();
                expect(execPath).to.include(path.join("ipfs", "main", "cli", "bin.js"));
                expect(fs.existsSync(execPath)).to.be.ok();
            });
        });
    }
});
