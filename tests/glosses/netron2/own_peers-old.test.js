const {
    is,
    netron: { PEER_STATUS, Netron, Context, Public }
} = adone;

describe("netron", "own peers", () => {
    let netron;

    beforeEach(() => {
        netron = new Netron();
    });


    it("GenesisNetron#connect(null) should return own peer", async () => {
        const ownPeer = await netron.connect(null);

        assert.true(is.netronOwnPeer(ownPeer));
        assert.true(ownPeer.isConnected());
        assert.equal(ownPeer.uid, netron.uid);
        assert.equal(ownPeer.getStatus(), PEER_STATUS.ONLINE);
        assert.null(await ownPeer.ping());
    });

    it("obtain interface of netron context", async () => {
        @Context()
        class CtxA {
            @Public()
            method1() {
                return "Adone";
            }
        }
        await netron.attachContext(new CtxA(), "a");
        const ownPeer = await netron.connect(null);
        const iA = ownPeer.getInterface("a");
        assert.equal(await iA.method1(), "Adone");

        await assert.throws(async () => ownPeer.disconnect());
    });

    it("attach remote context should simply attach context", async () => {
        @Context()
        class CtxA {
            @Public()
            method1() {
                return "Adone";
            }
        }
        const ownPeer = await netron.connect(null);
        await ownPeer.attachContextRemote(new CtxA());
        const iA = ownPeer.getInterface("CtxA");
        assert.equal(await iA.method1(), "Adone");
        assert.sameMembers(netron.getContextNames(), ["CtxA"]);

        await ownPeer.detachContextRemote("CtxA");
        assert.lengthOf(netron.getContextNames(), 0);
    });
});
