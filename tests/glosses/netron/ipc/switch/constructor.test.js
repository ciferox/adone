const Switch = require(adone.getPath("src/glosses/netron/ipc/switch"));

describe("create Switch instance", () => {
    it("throws on missing peerInfo", () => {
        expect(() => new Switch()).to.throw(/You must provide a `peerInfo`/);
    });
});
