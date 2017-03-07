const { Cancel, isCancel } = adone.net.http.client;

describe("isCancel", () => {
    it("returns true if value is a Cancel", () => {
        expect(isCancel(new Cancel())).to.be.true;
    });

    it("returns false if value is not a Cancel", () => {
        expect(isCancel({ foo: "bar" })).to.be.false;
    });
});
