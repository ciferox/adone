const identify = require(adone.getPath("src/glosses/netron/ipc/identify"));

describe("basic", () => {
    it("multicodec", () => {
        expect(identify.multicodec).to.eql("/ipfs/id/1.0.0");
    });
});
