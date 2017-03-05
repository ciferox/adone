import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "message", () => {
    const { response } = helpers;

    describe("get", () => {
        it("should return the response status message", () => {
            const res = response();
            res.status = 200;
            expect(res.message).to.be.equal("OK");
        });

        describe("when res.message not present", () => {
            it("should look up in statuses", () => {
                const res = response();
                res.res.statusCode = 200;
                expect(res.message).to.be.equal("OK");
            });
        });
    });

    describe("set", () => {
        it("should set response status message", () => {
            const res = response();
            res.status = 200;
            res.message = "ok";
            expect(res.res.statusMessage).to.be.equal("ok");
        });
    });
});
