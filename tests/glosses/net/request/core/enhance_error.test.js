/* global describe it */


import enhanceError from "adone/glosses/net/request/core/enhance_error";

describe("core::enhanceError", function () {
    it("should add config and code to error", function () {
        var error = new Error("Boom!");
        enhanceError(error, { foo: "bar" }, "ESOMETHING");
        expect(error.config).to.be.deep.equal({ foo: "bar" });
        expect(error.code).to.be.equal("ESOMETHING");
    });

    it("should return error", function () {
        var error = new Error("Boom!");
        expect(enhanceError(error, { foo: "bar" }, "ESOMETHING")).to.be.deep.equal(error);
    });
});