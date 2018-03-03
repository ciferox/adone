const {
    multi,
    omnitron2,
    realm
} = adone;

describe("omnitron2", "Dispatcher", () => {
    
    it("initialization", () => {
        const d = new omnitron2.Dispatcher();
        const omnitAddrs = d.omnitronPeerInfo.multiaddrs.toArray();
        assert.lengthOf(omnitAddrs, 1);
        assert.true(omnitAddrs[0].equals(multi.address2.fromNodeAddress(omnitron2.defaultAddress)));
        assert.strictEqual(d.netron.peer.info.id.asBase58(), realm.config.identity.client.id);
    });

    it("isOmnitronActive() should return false when omnitron is not active", async () => {
        const d = omnitron2.dispatcher;
        assert.false(await d.isOmnitronActive());
    });
});
