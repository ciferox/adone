import * as helpers from "../helpers";

describe("net", "http", "server", "request", "secure", () => {
    const { request } = helpers;

    it("should return true when encrypted", () => {
        const req = request();
        req.req.socket = { encrypted: true };
        expect(req.secure).to.be.true();
    });
});
