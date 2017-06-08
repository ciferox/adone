import enhanceError from "adone/glosses/net/http/client/enhance_error";

describe("net", "http", "client", "core", "enhanceError", () => {
    it("should add config and code to error", () => {
        const error = new Error("Boom!");
        enhanceError(error, { foo: "bar" }, "ESOMETHING");
        expect(error.config).to.be.deep.equal({ foo: "bar" });
        expect(error.code).to.be.equal("ESOMETHING");
    });

    it("should return error", () => {
        const error = new Error("Boom!");
        expect(enhanceError(error, { foo: "bar" }, "ESOMETHING")).to.be.deep.equal(error);
    });
});
