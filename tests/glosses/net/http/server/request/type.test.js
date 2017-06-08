import * as helpers from "../helpers";

describe("net", "http", "server", "request", "type", () => {
    const { request } = helpers;

    it("should return type void of parameters", () => {
        const req = request();
        req.header["content-type"] = "text/html; charset=utf-8";
        expect(req.type).to.be.equal("text/html");
    });

    describe("with no host present", () => {
        it("should be empty", () => {
            const req = request();
            assert(req.type === "");
        });
    });
});
