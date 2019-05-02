const waitFor = require("../utils/wait_for");
const mfsPreload = require(adone.path.join(adone.ROOT_PATH, "lib/ipfs/main/core/mfs-preload"));

const createMockFilesStat = (cids = []) => {
    let n = 0;
    return (path, cb) => cb(null, { hash: cids[n++] || "QmHash" });
};

const createMockPreload = () => {
    const preload = (cid, cb) => {
        preload.cids.push(cid);
        cb();
    };
    preload.cids = [];
    return preload;
};

describe("MFS preload", () => {
    // CIDs returned from our mock files.stat function
    const statCids = ["QmInitial", "QmSame", "QmSame", "QmUpdated"];
    let mockPreload;
    let mockFilesStat;
    let mockIpfs;

    beforeEach(() => {
        mockPreload = createMockPreload();
        mockFilesStat = createMockFilesStat(statCids);
        mockIpfs = {
            files: {
                stat: mockFilesStat
            },
            _preload: mockPreload,
            _options: {
                preload: {
                    interval: 10
                }
            }
        };
    });

    it("should preload MFS root periodically", function (done) {
        this.timeout(80 * 1000);

        mockIpfs._options.preload.enabled = true;

        // The CIDs we expect to have been preloaded
        const expectedPreloadCids = ["QmSame", "QmUpdated"];
        const preloader = mfsPreload(mockIpfs);

        preloader.start((err) => {
            expect(err).to.not.exist();

            const test = (cb) => {
                // Slice off any extra CIDs it processed
                const cids = mockPreload.cids.slice(0, expectedPreloadCids.length);
                if (cids.length !== expectedPreloadCids.length) {
                    return cb(null, false); 
                }
                cb(null, cids.every((cid, i) => cid === expectedPreloadCids[i]));
            };

            waitFor(test, { name: "CIDs to be preloaded" }, (err) => {
                expect(err).to.not.exist();
                preloader.stop(done);
            });
        });
    });

    it("should disable preloading MFS", (done) => {
        mockIpfs._options.preload.enabled = false;

        const preloader = mfsPreload(mockIpfs);

        preloader.start((err) => {
            expect(err).to.not.exist();

            setTimeout(() => {
                expect(mockPreload.cids).to.be.empty();

                done();
            }, 500);
        });
    });
});
