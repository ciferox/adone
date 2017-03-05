import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "length", () => {
    const { request } = helpers;

    it("should return length in content-length", () => {
        const req = request();
        req.header["content-length"] = "10";
        expect(req.length).to.be.equal(10);
    });

    describe("with no content-length present", () => {
        it("should be null", () => {
            const req = request();
            assert(req.length == null);
        });
    });
});
