import * as helpers from "../helpers";

describe("net", "http", "server", "request", "header", () => {
    const { request } = helpers;

    it("should return the request header object", () => {
        const req = request();
        expect(req.header).to.be.equal(req.req.headers);
    });

    it("should set the request header object", () => {
        const req = request();
        req.header = { "X-Custom-Headerfield": "Its one header, with headerfields" };
        expect(req.header).to.be.deep.equal(req.req.headers);
    });
});
