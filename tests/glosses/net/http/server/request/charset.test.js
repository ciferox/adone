import * as helpers from "../helpers";

describe("net", "http", "server", "request", "charset", () => {
    const { request } = helpers;

    describe("with no content-type present", () => {
        it('should return ""', () => {
            const req = request();
            assert(req.charset === "");
        });
    });

    describe("with charset present", () => {
        it('should return ""', () => {
            const req = request();
            req.header["content-type"] = "text/plain";
            assert(req.charset === "");
        });
    });

    describe("with a charset", () => {
        it("should return the charset", () => {
            const req = request();
            req.header["content-type"] = "text/plain; charset=utf-8";
            expect(req.charset).to.be.equal("utf-8");
        });

        it('should return "" if content-type is invalid', () => {
            const req = request();
            req.header["content-type"] = "application/json; application/text; charset=utf-8";
            expect(req.charset).to.be.equal("");
        });
    });
});
