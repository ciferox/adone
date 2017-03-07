import Dummy from "shani/helpers/spy";
import settle from "adone/glosses/net/http/client/core/settle";

describe("core::settle", () => {
    const resolve = new Dummy();
    const reject = new Dummy();

    beforeEach(() => {
        resolve.reset();
        reject.reset();
    });

    it("should resolve promise if status is not set", () => {
        const response = {
            config: {
                validateStatus() {
                    return true;
                }
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.get(0).args[0]).to.be.equal(response);
        expect(reject.calls).to.be.equal(0);
    });

    it("should resolve promise if validateStatus is not set", () => {
        const response = {
            status: 500,
            config: {
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.get(0).args[0]).to.be.equal(response);
        expect(reject.calls).to.be.equal(0);
    });

    it("should resolve promise if validateStatus returns true", () => {
        const response = {
            status: 500,
            config: {
                validateStatus() {
                    return true;
                }
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.get(0).args[0]).to.be.equal(response);
        expect(reject.calls).to.be.equal(0);
    });

    it("should reject promise if validateStatus returns false", () => {
        const response = {
            status: 500,
            config: {
                validateStatus() {
                    return false;
                }
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(resolve.calls).to.be.equal(0);
        expect(reject.calls).to.be.equal(1);
        const reason = reject.get(0).args[0];
        expect(reason.message).to.be.equal("Request failed with status code 500");
        expect(reason.config).to.be.deep.equal(response.config);
        expect(reason.response).to.be.deep.equal(response);
    });

    it("should pass status to validateStatus", () => {
        const validateStatus = new Dummy();
        const response = {
            status: 500,
            config: {
                validateStatus: validateStatus.callback
            }
        };
        settle(resolve.callback, reject.callback, response);
        expect(validateStatus.get(0).args[0]).to.be.equal(500);
    });
});
