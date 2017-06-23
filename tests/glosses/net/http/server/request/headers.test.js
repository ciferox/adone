import * as helpers from "../helpers";

describe("net", "http", "server", "request", "headers", () => {
    const { request } = helpers;

    it("should return the request header object", () => {
        const req = request();
        expect(req.headers).to.be.equal(req.req.headers);
    });

    it("should set the request header object", () => {
        const req = request();
        req.headers = { "X-Custom-Headerfield": "Its one header, with headerfields" };
        expect(req.headers).to.be.deep.equal(req.req.headers);
    });
});
