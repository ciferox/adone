/* global describe it beforeEach */


import Dummy from "../../../../helpers/spy";
import settle from "adone/glosses/net/request/core/settle";

describe("core::settle", function () {
    var resolve = new Dummy();
    var reject = new Dummy();

    beforeEach(function () {
        resolve.reset();
        reject.reset();
    });

    it("should resolve promise if status is not set", function () {
        var response = {
            config: {
                validateStatus: function () {
                    return true;
                }
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.get(0).args[0]).to.be.equal(response);
        expect(reject.calls).to.be.equal(0);
    });

    it("should resolve promise if validateStatus is not set", function () {
        var response = {
            status: 500,
            config: {
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.get(0).args[0]).to.be.equal(response);
        expect(reject.calls).to.be.equal(0);
    });

    it("should resolve promise if validateStatus returns true", function () {
        var response = {
            status: 500,
            config: {
                validateStatus: function () {
                    return true;
                }
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.get(0).args[0]).to.be.equal(response);
        expect(reject.calls).to.be.equal(0);
    });

    it("should reject promise if validateStatus returns false", function () {
        var response = {
            status: 500,
            config: {
                validateStatus: function () {
                    return false;
                }
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.calls).to.be.equal(0);
        expect(reject.calls).to.be.equal(1);
        var reason = reject.get(0).args[0];
        expect(reason.message).to.be.equal("Request failed with status code 500");
        expect(reason.config).to.be.deep.equal(response.config);
        expect(reason.response).to.be.deep.equal(response);
    });

    it("should pass status to validateStatus", function () {
        var validateStatus = new Dummy();
        var response = {
            status: 500,
            config: {
                validateStatus: validateStatus.callback
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(validateStatus.get(0).args[0]).to.be.equal(500);
    });
});
