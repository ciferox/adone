import * as helpers from "../helpers";

describe("net", "http", "server", "response", "length", () => {
    const { response } = helpers;
    const { fs } = adone;

    describe("when Content-Length is defined", () => {
        it("should return a number", () => {
            const res = response();
            res.header["content-length"] = "120";
            expect(res.length).to.be.equal(120);
        });
    });

    describe("when Content-Length is defined", () => {
        it("should return a number", () => {
            const res = response();
            res.set("Content-Length", "1024");
            expect(res.length).to.be.equal(1024);
        });
    });

    describe("when Content-Length is not defined", () => {
        describe("and a .body is set", () => {
            it("should return a number", () => {
                const res = response();

                res.body = "foo";
                res.remove("Content-Length");
                expect(res.length).to.be.equal(3);


                res.body = "foo";
                expect(res.length).to.be.equal(3);


                res.body = Buffer.from("foo bar");
                res.remove("Content-Length");
                expect(res.length).to.be.equal(7);


                res.body = Buffer.from("foo bar");
                expect(res.length).to.be.equal(7);


                res.body = { hello: "world" };
                res.remove("Content-Length");
                expect(res.length).to.be.equal(17);


                res.body = { hello: "world" };
                expect(res.length).to.be.equal(17);


                const stream = fs.createReadStream("package.json");
                try {
                    res.body = stream;
                    expect(res.length).not.to.be.ok();
                } finally {
                    stream.destroy();
                }

                res.body = null;
                expect(res.length).not.to.be.ok();
            });
        });

        describe("and .body is not", () => {
            it("should return undefined", () => {
                const res = response();
                assert(res.length == null);
            });
        });
    });
});
