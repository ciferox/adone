import * as helpers from "../helpers";

describe("net", "http", "server", "request", "idempotent", () => {
    const { request } = helpers;

    describe("when the request method is idempotent", () => {
        it("should return true", () => {
            for (const method of ["GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE"]) {
                const req = request();
                req.method = method;
                expect(req.idempotent).to.be.equal(true);
            }
        });
    });

    describe("when the request method is not idempotent", () => {
        it("should return false", () => {
            const req = request();
            req.method = "POST";
            expect(req.idempotent).to.be.equal(false);
        });
    });
});
