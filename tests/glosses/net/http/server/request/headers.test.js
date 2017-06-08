import * as helpers from "../helpers";

describe("net", "http", "server", "request", "headers", () => {
    const { request } = helpers;

    it("should return the request header object", () => {
        const req = request();
        expect(req.headers).to.be.equal(req.req.headers);
    });
});
