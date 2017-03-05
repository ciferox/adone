import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "etag", () => {
    const { response } = helpers;

    describe("get", () => {
        it("should return etag", () => {
            const res = response();
            res.etag = '"asdf"';
            expect(res.etag).to.be.equal('"asdf"');
        });
    });

    describe("set", () => {
        it("should not modify an etag with quotes", () => {
            const res = response();
            res.etag = '"asdf"';
            expect(res.header.etag).to.be.equal('"asdf"');
        });

        it("should not modify a weak etag", () => {
            const res = response();
            res.etag = 'W/"asdf"';
            expect(res.header.etag).to.be.equal('W/"asdf"');
        });

        it("should add quotes around an etag if necessary", () => {
            const res = response();
            res.etag = "asdf";
            expect(res.header.etag).to.be.equal('"asdf"');
        });
    });
});
