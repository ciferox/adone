const {
    netron: { P2PNetCore, createPeerInfo }
} = adone;

describe("netron", "P2PNetCore", () => {
    let peerInfo;

    before(async () => {
        peerInfo = await createPeerInfo({
            addr: "/ip4/0.0.0.0/tcp/0",
            bits: 512
        });
    });

    beforeEach(() => {

    });

    it("default core internals", () => {
        const core = new P2PNetCore();
        expect(core.peerInfo).to.be.undefined();
        expect(core.netron).to.be.null();
        expect(core.node).to.be.null();
    });

    it("start core with defaults", async () => {
        const core = new P2PNetCore();
        assert.isFalse(core.started);
        await core.start();
        assert.isTrue(core.started);
        const peerInfo = core.peerInfo;

        // assert.lengthOf(peerInfo.multiaddrs.toArray(), 2);

        for (const addr of peerInfo.multiaddrs.toArray()) {
            // eslint-disable-next-line no-await-in-loop
            assert.isFalse(await adone.net.checkPort(addr.nodeAddress()));
        }

        await core.stop();
        assert.isFalse(core.started);
    });

    it("start core with precreated peerInfo", async () => {
        const core = new P2PNetCore({
            peerInfo
        });
        assert.isFalse(core.started);
        await core.start();
        assert.isTrue(core.started);

        // assert.lengthOf(peerInfo.multiaddrs.toArray(), 2);

        for (const addr of peerInfo.multiaddrs.toArray()) {
            // eslint-disable-next-line no-await-in-loop
            assert.isFalse(await adone.net.checkPort(addr.nodeAddress()));
        }

        await core.stop();
        assert.isFalse(core.started);
    });

    it("set peerInfo after net core instantiated", async () => {
        const core = new P2PNetCore();
        core.setPeerInfo(peerInfo);
        assert.strictEqual(peerInfo, core.peerInfo);
        assert.isFalse(core.started);
        await core.start();
        assert.isTrue(core.started);

        // assert.lengthOf(peerInfo.multiaddrs.toArray(), 2);

        for (const addr of peerInfo.multiaddrs.toArray()) {
            // eslint-disable-next-line no-await-in-loop
            assert.isFalse(await adone.net.checkPort(addr.nodeAddress()));
        }

        await core.stop();
        assert.isFalse(core.started);
    });

    it("connect with defaults", async function (done) {
        this.timeout(100000000);
        const sCore = new P2PNetCore({ peerInfo });
        const cCore = new P2PNetCore({
            peerInfo: await createPeerInfo({
                addr: "/ip4/0.0.0.0/tcp/0",
                bits: 512
            })
        });

        await sCore.start();
        assert.isTrue(sCore.started);

        sCore.node.on("peer:connect", async (peerInfo) => {
            assert.deepEqual(peerInfo.id.toB58String(), cCore.peerInfo.id.toB58String());
            await sCore.stop();
            done();
        });

        await cCore.start();
        await cCore.connect({
            addr: peerInfo
        });
    });

    // it("should use precreated peerId", async () => {
    //     const peerId = await createPeerId({ bits: 512 });
    //     const peerInfo = await createPeerInfo({ peerId });
    //     assert.equal(peerId.toB58String(), peerInfo.id.toB58String());
    // });
}); 
