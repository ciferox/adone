/* global describe it */


import createError from "adone/glosses/net/request/core/create_error";

describe("core::createError", function () {
    it("should create an Error with message, config, and code", function () {
        var error = createError("Boom!", { foo: "bar" }, "ESOMETHING");
        expect(error.message).to.be.equal("Boom!");
        expect(error.config).to.be.deep.equal({ foo: "bar" });
        expect(error.code).to.be.equal("ESOMETHING");
    });
});