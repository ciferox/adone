import * as helpers from "../helpers";

describe("net", "http", "server", "request", "subdomains", () => {
    const { request } = helpers;

    it("should return subdomain array", () => {
        const req = request();
        req.header.host = "a.b.example.com";
        req.server.subdomainOffset = 2;
        expect(req.subdomains).to.be.deep.equal(["b", "a"]);


        req.server.subdomainOffset = 3;
        expect(req.subdomains).to.be.deep.equal(["a"]);
    });

    it("should work with no host present", () => {
        const req = request();
        expect(req.subdomains).to.be.deep.equal([]);
    });

    it("should check if the host is an ip address, even with a port", () => {
        const req = request();
        req.header.host = "127.0.0.1:3000";
        expect(req.subdomains).to.be.deep.equal([]);
    });
});
