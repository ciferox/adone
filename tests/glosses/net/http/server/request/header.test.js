import * as helpers from "../helpers";

describe("net", "http", "server", "request", "header", () => {
    const { request } = helpers;

    it("should return the request header object", () => {
        const req = request();
        expect(req.header).to.be.equal(req.req.headers);
    });
});
