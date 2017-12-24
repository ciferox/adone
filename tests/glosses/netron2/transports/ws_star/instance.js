const {
    netron2: { transport: { WSStar } }
} = adone;

describe("instantiate the transport", () => {
    it("create", () => {
        const wstar = new WSStar();
        assert.exists(wstar);
    });
});
