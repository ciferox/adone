const { Cancel } = adone.http.client;

describe("Cancel", () => {
    describe("toString", () => {
        it("returns correct result when message is not specified", () => {
            const cancel = new Cancel();
            expect(cancel.toString()).to.be.equal("Cancel");
        });

        it("returns correct result when message is specified", () => {
            const cancel = new Cancel("Operation has been canceled.");
            expect(cancel.toString()).to.be.equal("Cancel: Operation has been canceled.");
        });
    });
});
