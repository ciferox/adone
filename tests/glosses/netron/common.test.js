import { A } from "./contexts";

const {
    is,
    net: { p2p: { PeerInfo } },
    netron: { Netron, RemotePeer, meta: { Reflection }, Stub, Definitions, Reference }
} = adone;

describe("common stuff", () => {
    let peerInfo;
    let netron;

    before(() => {
        peerInfo = PeerInfo.create();
        netron = new Netron(peerInfo);
    });

    describe("predicates", () => {
        it("is.netron()", () => {
            assert.isTrue(is.netron(netron));
        });

        it("is.netronOwnPeer()", () => {
            assert.isTrue(is.netronPeer(netron.peer));
            assert.isTrue(is.netronOwnPeer(netron.peer));
        });

        it("is.netronRemotePeer()", () => {
            const rPeer = new RemotePeer(peerInfo, netron);
            assert.isTrue(is.netronPeer(rPeer));
            assert.isTrue(is.netronRemotePeer(rPeer));
        });

        it("is.netronContext()", () => {
            assert.isTrue(is.netronContext(new A()));
        });

        it("is.netronStub()", () => {
            assert.isTrue(is.netronStub(new Stub(netron, Reflection.from(new A()))));
        });

        it("is.netronDefinition()", () => {
            const stub = new Stub(netron, Reflection.from(new A()));
            assert.isTrue(is.netronDefinition(stub.definition));
        });

        it("is.netronDefinitions()", () => {
            assert.isTrue(is.netronDefinitions(new Definitions()));
        });

        it("is.netronReference()", () => {
            assert.isTrue(is.netronReference(new Reference(1)));
        });
    });

    describe("unique id generators", () => {
        it("fast numeric generator", () => {
            const generator = new adone.netron.FastUniqueId();

            for (let i = 1; i < 1000; i++) {
                assert.equal(generator.get(), i);
            }

            assert.isTrue(is.integer(generator.get()));
        });

        it("long-based/slow numeric generator", () => {
            const generator = new adone.netron.UniqueId();

            for (let i = 1; i < 1000; i++) {
                assert.isTrue(generator.get().equals(adone.math.Long.fromNumber(i)));
            }

            assert.isTrue(is.long(generator.get()));
        });
    });
});
