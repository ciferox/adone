const { client } = adone.net.http;

describe("adapter", () => {
    it("should support custom adapter", (done) => {
        let called = false;

        client("/foo", {
            adapter(resolve, reject, config) {
                called = true;
                return Promise.resolve({});
            }
        });

        setTimeout(() => {
            expect(called).to.be.true;
            done();
        }, 100);
    });
});
