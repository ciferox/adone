const waterfall = require("async/waterfall");
const { makePeers } = require("./utils");

const {
    data: { base32 },
    netron2: { dht, PeerId },
    util: { xorDistance }
} = adone;
const { utils } = adone.private(dht);

describe("utils", () => {
    describe("bufferToKey", () => {
        it("returns the base32 encoded key of the buffer", () => {
            const buf = Buffer.from("hello world");

            const key = utils.bufferToKey(buf);

            const enc = new base32.Encoder();
            expect(key.toString()).to.be.eql(`/${enc.write(buf).finalize()}`);
        });
    });

    describe("convertBuffer", () => {
        it("returns the sha2-256 hash of the buffer", () => {
            const buf = Buffer.from("hello world");

            const digest = utils.convertBuffer(buf);
            expect(digest).to.eql(Buffer.from("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9", "hex"));
        });
    });

    describe("sortClosestPeers", () => {
        it("sorts a list of PeerInfos", (done) => {
            const rawIds = [
                "11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31",
                "11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32",
                "11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33",
                "11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a34"
            ];

            const ids = rawIds.map((raw) => {
                return new PeerId(Buffer.from(raw));
            });

            const input = [
                ids[2],
                ids[1],
                ids[3],
                ids[0]
            ];

            const id = utils.convertPeerId(ids[0]);
            waterfall([
                (cb) => utils.sortClosestPeers(input, id, cb),
                (out, cb) => {
                    expect(
                        out.map((m) => m.toB58String())
                    ).to.be.eql([
                        ids[0],
                        ids[3],
                        ids[2],
                        ids[1]
                    ].map((m) => m.toB58String()));
                    cb();
                }
            ], done);
        });
    });

    describe("xorCompare", () => {
        it("sorts two distances", () => {
            const target = Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a90");
            const a = {
                distance: xorDistance.create(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a95"), target)
            };
            const b = {
                distance: xorDistance.create(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a96"), target)
            };

            expect(utils.xorCompare(a, b)).to.eql(-1);
            expect(utils.xorCompare(b, a)).to.eql(1);
            expect(utils.xorCompare(a, a)).to.eql(0);
        });
    });

    describe("keyForPublicKey", () => {
        it("works", () => {
            const peers = makePeers(1);
            expect(utils.keyForPublicKey(peers[0].id)).to.eql(Buffer.concat([Buffer.from("/pk/"), peers[0].id.id]));
        });
    });

    describe("fromPublicKeyKey", () => {
        it("round trips", function () {
            this.timeout(40 * 1000);

            const peers = makePeers(50);
            peers.forEach((p, i) => {
                const id = p.id;
                expect(utils.isPublicKeyKey(utils.keyForPublicKey(id))).to.eql(true);
                expect(utils.fromPublicKeyKey(utils.keyForPublicKey(id)).id).to.eql(id.id);
            });
        });
    });
});