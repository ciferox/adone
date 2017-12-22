import * as helpers from "../helpers";

describe("net", "http", "server", "request", "whatwg url", () => {
    const { request } = helpers;

    describe("should not throw when", () => {
        it("host is void", () => {
            const req = request();
            expect(() => req.URL).not.to.throw();
        });

        it("header.host is invalid", () => {
            const req = request();
            req.header.host = "invalid host";
            expect(() => req.URL).not.to.throw();
        });
    });

    it("should return empty object when invalid", () => {
        const req = request();
        req.header.host = "invalid host";
        expect(req.URL).to.be.empty();
    });
});
