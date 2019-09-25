const {
    p2p: { transport: { WSStar }}
} = adone;

describe("instantiate the transport", () => {
    it("create", () => {
        const wstar = new WSStar();
        expect(wstar).to.exist();
    });

    it("create without new", () => {
        expect(() => WSStar()).to.throw();
    });
});
