const {
    p2p: { Switch }
} = adone;

describe("create Switch instance", () => {
    it("throws on missing peerInfo", () => {
        expect(() => new Switch()).to.throw(/You must provide a `peerInfo`/);
    });
});
