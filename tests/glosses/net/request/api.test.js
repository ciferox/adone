/* global describe it */


const { request } = adone.net;

describe("static api", function () {
    it("should have request method helpers", function () {
        expect(typeof request.get).to.be.equal("function");
        expect(typeof request.head).to.be.equal("function");
        expect(typeof request.delete).to.be.equal("function");
        expect(typeof request.post).to.be.equal("function");
        expect(typeof request.put).to.be.equal("function");
        expect(typeof request.patch).to.be.equal("function");
    });

    it("should have promise method helpers", function () {
        var promise = request();
        expect(typeof promise.then).to.be.equal("function");
        expect(typeof promise.catch).to.be.equal("function");
        promise.catch(() => {});
    });

    it("should have defaults", function () {
        expect(typeof request.defaults).to.be.equal("object");
        expect(typeof request.defaults.headers).to.be.equal("object");
    });

    it("should have interceptors", function () {
        expect(typeof request.interceptors.request).to.be.equal("object");
        expect(typeof request.interceptors.response).to.be.equal("object");
    });

    it("should have factory method", function () {
        expect(typeof request.create).to.be.equal("function");
    });

    it("should have Cancel, CancelToken, and isCancel properties", function () {
        expect(typeof request.Cancel).to.be.equal("function");
        expect(typeof request.CancelToken).to.be.equal("function");
        expect(typeof request.isCancel).to.be.equal("function");
    });
});

describe("instance api", function () {
    var instance = request.create();

    it("should have request methods", function () {
        expect(typeof instance.get).to.be.equal("function");
        expect(typeof instance.head).to.be.equal("function");
        expect(typeof instance.delete).to.be.equal("function");
        expect(typeof instance.post).to.be.equal("function");
        expect(typeof instance.put).to.be.equal("function");
        expect(typeof instance.patch).to.be.equal("function");
    });

    it("should have interceptors", function () {
        expect(typeof instance.interceptors.request).to.be.equal("object");
        expect(typeof instance.interceptors.response).to.be.equal("object");
    });
});