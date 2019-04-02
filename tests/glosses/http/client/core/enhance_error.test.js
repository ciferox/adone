const { enhanceError } = adone.http.client;

describe("core", "enhanceError", () => {
    it("should add config, config, request and response to error", () => {
        const error = new Error("Boom!");
        const request = { path: "/foo" };
        const response = { status: 200, data: { foo: "bar" } };

        enhanceError(error, { foo: "bar" }, "ESOMETHING", request, response);
        expect(error.config).to.be.deep.equal({ foo: "bar" });
        expect(error.code).to.be.deep.equal("ESOMETHING");
        expect(error.request).to.be.deep.equal(request);
        expect(error.response).to.be.deep.equal(response);
    });

    it("should return error", () => {
        const error = new Error("Boom!");
        expect(enhanceError(error, { foo: "bar" }, "ESOMETHING")).to.be.deep.equal(error);
    });
});
