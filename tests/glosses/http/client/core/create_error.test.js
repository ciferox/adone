const { createError } = adone.http.client;

describe("core", "createError", () => {
    it("should create an Error with message, config, code, request, response and isADONEError", () => {
        const request = { path: "/foo" };
        const response = { status: 200, data: { foo: "bar" } };
        const error = createError("Boom!", { foo: "bar" }, "ESOMETHING", request, response);
        expect(error instanceof Error).to.eql(true);
        expect(error.message).to.eql("Boom!");
        expect(error.config).to.eql({ foo: "bar" });
        expect(error.code).to.eql("ESOMETHING");
        expect(error.request).to.eql(request);
        expect(error.response).to.eql(response);
        expect(error.isADONEError).to.be.true;
    });

    it("should create an Error that can be serialized to JSON", () => {
        // Attempting to serialize request and response results in
        //    TypeError: Converting circular structure to JSON
        const request = { path: "/foo" };
        const response = { status: 200, data: { foo: "bar" } };
        const error = createError("Boom!", { foo: "bar" }, "ESOMETHING", request, response);
        const json = error.toJSON();
        expect(json.message).to.be.equal("Boom!");
        expect(json.config).to.eql({ foo: "bar" });
        expect(json.code).to.be.equal("ESOMETHING");
        expect(json.request).to.be.equal(undefined);
        expect(json.response).to.be.equal(undefined);
    });
});
