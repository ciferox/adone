import createError from "adone/glosses/net/http/client/create_error";

describe("net", "http", "client", "core", "createError", () => {
    it("should create an Error with message, config, code, request and response", () => {
        const request = { path: "/foo" };
        const response = { status: 200, data: { foo: "bar" } };
        const error = createError("Boom!", { foo: "bar" }, "ESOMETHING", request, response);
        expect(error instanceof Error).to.eql(true);
        expect(error.message).to.eql("Boom!");
        expect(error.config).to.eql({ foo: "bar" });
        expect(error.code).to.eql("ESOMETHING");
        expect(error.request).to.eql(request);
        expect(error.response).to.eql(response);
    });
});
