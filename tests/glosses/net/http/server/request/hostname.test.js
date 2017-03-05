import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "hostname", () => {
    const { request } = helpers;

    it("should return hostname void of port", () => {
        const req = request();
        req.header.host = "foo.com:3000";
        expect(req.hostname).to.be.equal("foo.com");
    });

    describe("with no host present", () => {
        it('should return ""', () => {
            const req = request();
            assert.equal(req.hostname, "");
        });
    });

    describe("when X-Forwarded-Host is present", () => {
        describe("and proxy is not trusted", () => {
            it("should be ignored", () => {
                const req = request();
                req.header["x-forwarded-host"] = "bar.com";
                req.header.host = "foo.com";
                expect(req.hostname).to.be.equal("foo.com");
            });
        });

        describe("and proxy is trusted", () => {
            it("should be used", () => {
                const req = request();
                req.server.proxy = true;
                req.header["x-forwarded-host"] = "bar.com, baz.com";
                req.header.host = "foo.com";
                expect(req.hostname).to.be.equal("bar.com");
            });
        });
    });
});
