// for complete this whole test case should be with '--per-process' options
const {
    p2p: { transport: { WebRTCStar } }
} = adone;

describe("instantiate the transport", () => {
    it.skip("create", () => {
        const wstar = new WebRTCStar();
        expect(wstar).to.exist();
    });

    it("create without new", () => {
        expect(() => WebRTCStar()).to.throw();
    });
});
