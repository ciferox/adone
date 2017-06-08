import * as helpers from "../helpers";

describe("net", "http", "server", "request", "protocol", () => {
    const { request } = helpers;

    describe("when encrypted", () => {
        it('should return "https"', () => {
            const req = request();
            req.req.socket = { encrypted: true };
            expect(req.protocol).to.be.equal("https");
        });
    });

    describe("when unencrypted", () => {
        it('should return "http"', () => {
            const req = request();
            req.req.socket = {};
            expect(req.protocol).to.be.equal("http");
        });
    });

    describe("when X-Forwarded-Proto is set", () => {
        describe("and proxy is trusted", () => {
            it("should be used", () => {
                const req = request();
                req.server.proxy = true;
                req.req.socket = {};
                req.header["x-forwarded-proto"] = "https, http";
                expect(req.protocol).to.be.equal("https");
            });

            describe("and X-Forwarded-Proto is empty", () => {
                it('should return "http"', () => {
                    const req = request();
                    req.server.proxy = true;
                    req.req.socket = {};
                    req.header["x-forwarded-proto"] = "";
                    expect(req.protocol).to.be.equal("http");
                });
            });
        });

        describe("and proxy is not trusted", () => {
            it("should not be used", () => {
                const req = request();
                req.req.socket = {};
                req.header["x-forwarded-proto"] = "https, http";
                expect(req.protocol).to.be.equal("http");
            });
        });
    });
});
