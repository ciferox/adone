import { A, B } from "./contexts";

const {
    is,
    net: { p2p: { PeerInfo } },
    netron2: { PEER_STATUS, Netron, Context, Public }
} = adone;

describe("netron", "own peers", () => {
    let peerInfo;
    let netron;
    let peer;

    before(() => {
        peerInfo = PeerInfo.create();
    });

    beforeEach(() => {
        netron = new Netron(peerInfo);
        peer = netron.peer;
    });

    it("isConnected() always return true", () => {
        assert.true(peer.isConnected());
    });

    it("isNetronConnected() always return true", () => {
        assert.true(peer.isNetronConnected());
    });

    it("hasContexts()", () => {
        assert.false(peer.hasContexts());
    });

    it("getContextNames()", () => {
        assert.lengthOf(peer.getContextNames(), 0);
    });

    it("hasContext() should return false for unknown context", () => {
        assert.false(peer.hasContext("a"));
    });

    it("attachContext()", () => {
        assert.false(peer.hasContexts());
        peer.attachContext(new A(), "a");
        assert.true(peer.hasContexts());
        assert.sameDeepMembers(peer.getContextNames(), ["a"]);
    });

    it("detachContext()", () => {
        peer.attachContext(new A(), "a");
        assert.true(peer.hasContexts());
        peer.detachContext("a");
        assert.false(peer.hasContexts());
    });

    it("request meta 'ability' should return all netron options", async () => {
        const response = await peer.requestMeta("ability");
        assert.deepEqual(response.length, 1);
        const ability = response[0];
        assert.equal(ability.id, "ability");
        assert.deepEqual(ability.data, netron.options);
        assert.deepEqual(peer.meta.get("ability"), adone.util.omit(ability, "id"));
    });

    it("request meta 'contexts' should returl all context definitions", async () => {
        peer.attachContext(new A(), "a");
        peer.attachContext(new B(), "b");
        const response = await peer.requestMeta("contexts");
        assert.deepEqual(response.length, 1);
        const contexts = response[0];
        assert.equal(contexts.id, "contexts");
        assert.sameMembers(Object.keys(contexts.data), ["a", "b"]);
    });

    // it("GenesisNetron#connect(null) should return own peer", async () => {
    //     const ownPeer = await netron.connect(null);

    //     assert.true(is.netronOwnPeer(ownPeer));
    //     assert.true(ownPeer.isConnected());
    //     assert.equal(ownPeer.uid, netron.uid);
    //     assert.equal(ownPeer.getStatus(), PEER_STATUS.ONLINE);
    //     assert.null(await ownPeer.ping());
    // });

    // it("obtain interface of netron context", async () => {
    //     @Context()
    //     class CtxA {
    //         @Public()
    //         method1() {
    //             return "Adone";
    //         }
    //     }
    //     await netron.attachContext(new CtxA(), "a");
    //     const ownPeer = await netron.connect(null);
    //     const iA = ownPeer.getInterface("a");
    //     assert.equal(await iA.method1(), "Adone");

    //     await assert.throws(async () => ownPeer.disconnect());
    // });

    // it("attach remote context should simply attach context", async () => {
    //     @Context()
    //     class CtxA {
    //         @Public()
    //         method1() {
    //             return "Adone";
    //         }
    //     }
    //     const ownPeer = await netron.connect(null);
    //     await ownPeer.attachContextRemote(new CtxA());
    //     const iA = ownPeer.getInterface("CtxA");
    //     assert.equal(await iA.method1(), "Adone");
    //     assert.sameMembers(netron.getContextNames(), ["CtxA"]);

    //     await ownPeer.detachContextRemote("CtxA");
    //     assert.lengthOf(netron.getContextNames(), 0);
    // });
});
