import { A } from "./contexts";

const {
    is,
    net: { p2p: { PeerInfo } },
    netron2: { Netron, RemotePeer, meta: { Reflection }, Stub, Definitions, Reference }
} = adone;

describe("common stuff", () => {
    let peerInfo;
    let netron;

    before(() => {
        peerInfo = PeerInfo.create();
        netron = new Netron(peerInfo);
    });

    describe("predicates", () => {
        it("is.netron2()", () => {
            assert.true(is.netron2(netron));
        });

        it("is.netron2OwnPeer()", () => {
            assert.true(is.netron2Peer(netron.peer));
            assert.true(is.netron2OwnPeer(netron.peer));
        });

        it("is.netron2RemotePeer()", () => {
            const rPeer = new RemotePeer(peerInfo, netron);
            assert.true(is.netron2Peer(rPeer));
            assert.true(is.netron2RemotePeer(rPeer));
        });

        it("is.netron2Context()", () => {
            assert.true(is.netron2Context(new A()));
        });

        it("is.netron2Stub()", () => {
            assert.true(is.netron2Stub(new Stub(netron, Reflection.from(new A()))));
        });

        it("is.netron2Definition()", () => {
            const stub = new Stub(netron, Reflection.from(new A()));
            assert.true(is.netron2Definition(stub.definition));
        });

        it("is.netron2Definitions()", () => {
            assert.true(is.netron2Definitions(new Definitions()));
        });

        it("is.netron2Reference()", () => {
            assert.true(is.netron2Reference(new Reference(1)));
        });
    });

    describe("unique id generators", () => {
        it("fast numeric generator", () => {
            const generator = new adone.netron2.FastUniqueId();

            for (let i = 1; i < 1000; i++) {
                assert.equal(generator.get(), i);
            }

            assert.true(is.integer(generator.get()));
        });

        it("long-based/slow numeric generator", () => {
            const generator = new adone.netron2.UniqueId();

            for (let i = 1; i < 1000; i++) {
                assert.true(generator.get().equals(adone.math.Long.fromNumber(i)));
            }

            assert.true(is.long(generator.get()));
        });
    });
});
