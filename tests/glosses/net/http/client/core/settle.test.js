import settle from "adone/glosses/net/http/client/settle";

describe("net", "http", "client", "core", "settle", () => {
    const resolve = spy();
    const reject = spy();

    beforeEach(() => {
        resolve.reset();
        reject.reset();
    });

    it("should resolve promise if status is not set", () => {
        const response = {
            options: {
                validateStatus() {
                    return true;
                }
            }
        };
        settle(resolve, reject, response);
        expect(resolve).to.have.been.calledOnce;
        expect(resolve).to.have.been.calledWith(response);
        expect(reject).not.to.have.been.called;
    });

    it("should resolve promise if validateStatus is not set", () => {
        const response = {
            status: 500,
            options: {
            }
        };
        settle(resolve, reject, response);
        expect(resolve.getCall(0).args[0]).to.be.equal(response);
        expect(reject.callCount).to.be.equal(0);
        expect(reject).not.to.have.been.called;
    });

    it("should resolve promise if validateStatus returns true", () => {
        const response = {
            status: 500,
            options: {
                validateStatus() {
                    return true;
                }
            }
        };
        settle(resolve, reject, response);
        expect(resolve).to.have.been.calledOnce;
        expect(resolve).to.have.been.calledWith(response);
        expect(reject).not.to.have.been.called;
    });

    it("should reject promise if validateStatus returns false", () => {
        const response = {
            status: 500,
            options: {
                validateStatus() {
                    return false;
                }
            }
        };
        settle(resolve, reject, response);
        expect(resolve).not.to.have.been.called;
        expect(reject).to.have.been.calledOnce;
        const reason = reject.getCall(0).args[0];
        expect(reason.message).to.be.equal("Request failed with status code 500");
        expect(reason.config).to.be.deep.equal(response.options);
        expect(reason.response).to.be.deep.equal(response);
    });

    it("should pass status to validateStatus", () => {
        const validateStatus = spy();
        const response = {
            status: 500,
            options: {
                validateStatus
            }
        };
        settle(resolve, reject, response);
        expect(validateStatus.getCall(0).args[0]).to.be.equal(500);
    });
});
