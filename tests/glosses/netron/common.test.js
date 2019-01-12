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
            assert.true(is.netron(netron));
        });

        it("is.netronOwnPeer()", () => {
            assert.true(is.netronPeer(netron.peer));
            assert.true(is.netronOwnPeer(netron.peer));
        });

        it("is.netronRemotePeer()", () => {
            const rPeer = new RemotePeer(peerInfo, netron);
            assert.true(is.netronPeer(rPeer));
            assert.true(is.netronRemotePeer(rPeer));
        });

        it("is.netronContext()", () => {
            assert.true(is.netronContext(new A()));
        });

        it("is.netronStub()", () => {
            assert.true(is.netronStub(new Stub(netron, Reflection.from(new A()))));
        });

        it("is.netronDefinition()", () => {
            const stub = new Stub(netron, Reflection.from(new A()));
            assert.true(is.netronDefinition(stub.definition));
        });

        it("is.netronDefinitions()", () => {
            assert.true(is.netronDefinitions(new Definitions()));
        });

        it("is.netronReference()", () => {
            assert.true(is.netronReference(new Reference(1)));
        });
    });

    describe("unique id generators", () => {
        it("fast numeric generator", () => {
            const generator = new adone.netron.FastUniqueId();

            for (let i = 1; i < 1000; i++) {
                assert.equal(generator.get(), i);
            }

            assert.true(is.integer(generator.get()));
        });

        it("long-based/slow numeric generator", () => {
            const generator = new adone.netron.UniqueId();

            for (let i = 1; i < 1000; i++) {
                assert.true(generator.get().equals(adone.math.Long.fromNumber(i)));
            }

            assert.true(is.long(generator.get()));
        });
    });
});
