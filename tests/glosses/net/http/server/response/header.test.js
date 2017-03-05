import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "header", () => {
    const { response } = helpers;

    it("should return the response header object", () => {
        const res = response();
        res.set("X-Foo", "bar");
        expect(res.header).to.be.deep.equal({ "x-foo": "bar" });
    });

    describe("when res._headers not present", () => {
        it("should return empty object", () => {
            const res = response();
            res.res._headers = null;
            expect(res.header).to.be.deep.equal({});
        });
    });
});
