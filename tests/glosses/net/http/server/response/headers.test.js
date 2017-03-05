import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "headers", () => {
    const { response } = helpers;

    it("should return the response header object", () => {
        const res = response();
        res.set("X-Foo", "bar");
        expect(res.headers).to.be.deep.equal({ "x-foo": "bar" });
    });

    describe("when res._headerss not present", () => {
        it("should return empty object", () => {
            const res = response();
            res.res._headers = null;
            expect(res.headers).to.be.deep.equal({});
        });
    });
});
