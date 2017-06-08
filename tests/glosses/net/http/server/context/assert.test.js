describe("net", "http", "server", "context", () => {
    const { net: { http: { server: { Context } } } } = adone;

    it("should throw an error", () => {
        const ctx = new Context({}, {}, {});

        try {
            ctx.assert(false, 404);
            throw new Error("asdf");
        } catch (err) {
            assert(err.status === 404);
            assert(err.expose);
        }
    });
});
