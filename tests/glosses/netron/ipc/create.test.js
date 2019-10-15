const createNode = require("./utils/create-node");
const sinon = require("sinon");
const { create } = adone.netron.ipc.Node;
const TCP = require("libp2p-tcp");
const PeerInfo = require("peer-info");

describe("node creation", () => {
    afterEach(() => {
        sinon.restore();
    });

    it("should not create disabled modules", (done) => {
        createNode([], {}, (err, node) => {
            expect(err).to.not.exist();
            expect(node._pubsub).to.not.exist();
            done();
        });
    });

    it("should not throw errors from switch if node has no error listeners", (done) => {
        createNode([], {}, (err, node) => {
            expect(err).to.not.exist();

            node._switch.emit("error", new Error("bad things"));
            done();
        });
    });

    it("should emit errors from switch if node has error listeners", (done) => {
        const error = new Error("bad things");
        createNode([], {}, (err, node) => {
            expect(err).to.not.exist();
            node.once("error", (err) => {
                expect(err).to.eql(error);
                done();
            });
            node._switch.emit("error", error);
        });
    });

    it("create() should create a peerInfo instance", function (done) {
        this.timeout(10e3);
        create({
            modules: {
                transport: [TCP]
            }
        }, (err, libp2p) => {
            expect(err).to.not.exist();
            expect(libp2p).to.exist();
            done();
        });
    });

    it("create should allow for a provided peerInfo instance", function (done) {
        this.timeout(10e3);
        PeerInfo.create((err, peerInfo) => {
            expect(err).to.not.exist();
            sinon.spy(PeerInfo, "create");
            create({
                peerInfo,
                modules: {
                    transport: [TCP]
                }
            }, (err, libp2p) => {
                expect(err).to.not.exist();
                expect(libp2p).to.exist();
                expect(PeerInfo.create.callCount).to.eql(0);
                done();
            });
        });
    });
});
