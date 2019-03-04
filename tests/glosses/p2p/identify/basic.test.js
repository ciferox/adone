const {
    p2p: { identify }
} = adone;

describe("basic", () => {
    it("multicodec", () => {
        expect(identify.multicodec).to.eql("/ipfs/id/1.0.0");
    });
});
