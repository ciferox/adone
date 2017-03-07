import createError from "adone/glosses/net/http/client/core/create_error";

describe("core::createError", () => {
    it("should create an Error with message, config, and code", () => {
        const error = createError("Boom!", { foo: "bar" }, "ESOMETHING");
        expect(error.message).to.be.equal("Boom!");
        expect(error.config).to.be.deep.equal({ foo: "bar" });
        expect(error.code).to.be.equal("ESOMETHING");
    });
});
