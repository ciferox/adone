const {
    netron: { P2PNetCore }
} = adone;

describe("netron", "P2PNetCore", () => {
    let peerInfo;

    before(async () => {
        peerInfo = await P2PNetCore.createPeerInfo({
            addrs: "/ip4/0.0.0.0/tcp/0",
            bits: 512
        });
    });

    beforeEach(() => {

    });

    it("start core with defaults", async () => {
        const core = new P2PNetCore();
        assert.isFalse(core.started);
        await core.start();
        assert.isTrue(core.started);
        const peerInfo = core.getPeerInfo();

        assert.lengthOf(peerInfo.multiaddrs.toArray(), 2);

        for (const addr of peerInfo.multiaddrs.toArray()) {
            // eslint-disable-next-line no-await-in-loop
            assert.isFalse(await adone.net.util.isFreePort(addr.nodeAddress()));
        }

        await core.stop();
    });

    it("start core with precreated peerInfo", async () => {
        const core = new P2PNetCore({
            peerInfo
        });
        assert.isFalse(core.started);
        await core.start();
        assert.isTrue(core.started);

        assert.lengthOf(peerInfo.multiaddrs.toArray(), 2);

        for (const addr of peerInfo.multiaddrs.toArray()) {
            // eslint-disable-next-line no-await-in-loop
            assert.isFalse(await adone.net.util.isFreePort(addr.nodeAddress()));
        }

        await core.stop();
    });

    it("set peerInfo after net core instantiated", async () => {
        const core = new P2PNetCore();
        core.setPeerInfo(peerInfo);
        assert.isFalse(core.started);
        await core.start();
        assert.isTrue(core.started);

        assert.lengthOf(peerInfo.multiaddrs.toArray(), 2);

        for (const addr of peerInfo.multiaddrs.toArray()) {
            // eslint-disable-next-line no-await-in-loop
            assert.isFalse(await adone.net.util.isFreePort(addr.nodeAddress()));
        }

        await core.stop();
    });

    it("connect with defaults", async (done) => {
        const sCore = new P2PNetCore({ peerInfo });

        const cPeerInfo = await P2PNetCore.createPeerInfo({
            addrs: "/ip4/0.0.0.0/tcp/0",
            bits: 512
        });
        const cCore = new P2PNetCore({ peerInfo: cPeerInfo });

        await sCore.start();
        assert.isTrue(sCore.started);

        sCore.node.on("peer:connect", async (peerInfo) => {
            assert.deepEqual(peerInfo.id.toB58String(), cPeerInfo.id.toB58String());
            await sCore.stop();
            done();
        });

        await cCore.start();
        await cCore.connect(peerInfo);
    });

    it("should use precreated peerId", async () => {
        const peerId = await P2PNetCore.createPeerId({ bits: 512 });
        const peerInfo = await P2PNetCore.createPeerInfo({ peerId });
        assert.equal(peerId.toB58String(), peerInfo.id.toB58String());
    });
}); 
