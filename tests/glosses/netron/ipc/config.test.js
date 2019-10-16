const PeerInfo = require("peer-info");
const PeerId = require("peer-id");
const waterfall = require("async/waterfall");
const TCP = require("libp2p-tcp");

const validateConfig = require(adone.getPath("src/glosses/netron/ipc/config")).validate;

describe("configuration", () => {
    let peerInfo;

    before((done) => {
        waterfall([
            (cb) => PeerId.create({ bits: 512 }, cb),
            (peerId, cb) => PeerInfo.create(peerId, cb),
            (info, cb) => {
                peerInfo = info;
                cb();
            }
        ], () => done());
    });

    it("should throw an error if peerInfo is missing", () => {
        expect(() => {
            validateConfig({
                modules: {
                    transport: [TCP]
                }
            });
        }).to.throw();
    });

    it("should throw an error if modules is missing", () => {
        expect(() => {
            validateConfig({
                peerInfo
            });
        }).to.throw();
    });

    it("should throw an error if there are no transports", () => {
        expect(() => {
            validateConfig({
                peerInfo,
                modules: {
                    transport: []
                }
            });
        }).to.throw("ERROR_EMPTY");
    });

    it("should add defaults to config", () => {
        const options = {
            peerInfo,
            modules: {
                transport: [TCP]
            }
        };

        const expected = {
            peerInfo,
            modules: {
                transport: [TCP]
            }
        };

        expect(validateConfig(options)).to.deep.equal(expected);
    });

    it("should add defaults to missing items", () => {
        const options = {
            peerInfo,
            modules: {
                transport: [TCP]
            }
        };

        const expected = {
            peerInfo,
            modules: {
                transport: [TCP]
            }
        };

        expect(validateConfig(options)).to.deep.equal(expected);
    });

    it("should allow for configuring the switch", () => {
        const options = {
            peerInfo,
            switch: {
                denyTTL: 60e3,
                denyAttempts: 5,
                maxParallelDials: 100,
                maxColdCalls: 50,
                dialTimeout: 30e3
            },
            modules: {
                transport: [TCP]
            }
        };

        expect(validateConfig(options)).to.deep.include({
            switch: {
                denyTTL: 60e3,
                denyAttempts: 5,
                maxParallelDials: 100,
                maxColdCalls: 50,
                dialTimeout: 30e3
            }
        });
    });
});
