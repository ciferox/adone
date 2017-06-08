import * as helpers from "../helpers";

describe("net", "http", "server", "request", "ips", () => {
    const { request } = helpers;

    describe("when X-Forwarded-For is present", () => {
        describe("and proxy is not trusted", () => {
            it("should be ignored", () => {
                const req = request();
                req.server.proxy = false;
                req.header["x-forwarded-for"] = "127.0.0.1,127.0.0.2";
                expect(req.ips).to.be.deep.equal([]);
            });
        });

        describe("and proxy is trusted", () => {
            it("should be used", () => {
                const req = request();
                req.server.proxy = true;
                req.header["x-forwarded-for"] = "127.0.0.1,127.0.0.2";
                expect(req.ips).to.be.deep.equal(["127.0.0.1", "127.0.0.2"]);
            });
        });
    });
});
