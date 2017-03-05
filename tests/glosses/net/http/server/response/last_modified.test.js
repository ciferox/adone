import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "last modified", () => {
    const { response } = helpers;

    it("should set the header as a UTCString", () => {
        const res = response();
        const date = new Date();
        res.lastModified = date;
        expect(res.header["last-modified"]).to.be.equal(date.toUTCString());
    });

    it("should work with date strings", () => {
        const res = response();
        const date = new Date();
        res.lastModified = date.toString();
        expect(res.header["last-modified"]).to.be.equal(date.toUTCString());
    });

    it("should get the header as a Date", () => {
        // Note: Date() removes milliseconds, but it's practically important.
        const res = response();
        const date = new Date();
        res.lastModified = date;
        expect(res.lastModified.getTime() / 1000).to.be.equal(Math.floor(date.getTime() / 1000));
    });

    describe("when lastModified not set", () => {
        it("should get undefined", () => {
            const res = response();
            expect(res.lastModified).to.be.undefined;
        });
    });
});
