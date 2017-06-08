import * as helpers from "../helpers";

describe("net", "http", "server", "response", "body", () => {
    const { fs } = adone;
    const { response } = helpers;

    describe("set", () => {
        describe("when Content-Type is set", () => {
            it("should not override", () => {
                const res = response();
                res.type = "png";
                res.body = new Buffer("something");
                assert(res.header["content-type"] == "image/png");
            });

            describe("when body is an object", () => {
                it("should override as json", () => {
                    const res = response();

                    res.body = "<em>hey</em>";
                    assert(res.header["content-type"] == "text/html; charset=utf-8");

                    res.body = { foo: "bar" };
                    assert(res.header["content-type"] == "application/json; charset=utf-8");
                });
            });

            it("should override length", () => {
                const res = response();
                res.type = "html";
                res.body = "something";
                expect(res.length).to.be.equal(9);
            });
        });

        describe("when a string is given", () => {
            it("should default to text", () => {
                const res = response();
                res.body = "Hello";
                assert(res.header["content-type"] == "text/plain; charset=utf-8");
            });

            it("should set length", () => {
                const res = response();
                res.body = "Hello";
                assert(res.header["content-length"] == "5");
            });

            describe("and contains a non-leading <", () => {
                it("should default to text", () => {
                    const res = response();
                    res.body = "aklsdjf < klajsdlfjasd";
                    assert(res.header["content-type"] == "text/plain; charset=utf-8");
                });
            });
        });

        describe("when an html string is given", () => {
            it("should default to html", () => {
                const res = response();
                res.body = "<h1>Hello</h1>";
                assert(res.header["content-type"] == "text/html; charset=utf-8");
            });

            it("should set length", () => {
                const string = "<h1>Hello</h1>";
                const res = response();
                res.body = string;
                assert.equal(res.length, Buffer.byteLength(string));
            });

            it("should set length when body is overridden", () => {
                const string = "<h1>Hello</h1>";
                const res = response();
                res.body = string;
                res.body = string + string;
                assert.equal(res.length, 2 * Buffer.byteLength(string));
            });

            describe("when it contains leading whitespace", () => {
                it("should default to html", () => {
                    const res = response();
                    res.body = "    <h1>Hello</h1>";
                    assert(res.header["content-type"] == "text/html; charset=utf-8");
                });
            });
        });

        describe("when an xml string is given", () => {
            it("should default to html", () => {
                /**
                 * ctx test is to show that we're not going
                 * to be stricter with the html sniff
                 * or that we will sniff other string types.
                 * You should `.type=` if ctx simple test fails.
                 */

                const res = response();
                res.body = '<?xml version="1.0" encoding="UTF-8"?>\n<俄语>данные</俄语>';
                assert(res.header["content-type"] == "text/html; charset=utf-8");
            });
        });

        describe("when a stream is given", () => {
            it("should default to an octet stream", () => {
                const res = response();
                const stream = fs.createReadStream(__filename);
                res.body = stream;
                try {
                    assert(res.header["content-type"] == "application/octet-stream");
                } finally {
                    stream.destroy();
                }
            });
        });

        describe("when a buffer is given", () => {
            it("should default to an octet stream", () => {
                const res = response();
                res.body = new Buffer("hey");
                assert(res.header["content-type"] == "application/octet-stream");
            });

            it("should set length", () => {
                const res = response();
                res.body = new Buffer("Hello");
                assert(res.header["content-length"] == "5");
            });
        });

        describe("when an object is given", () => {
            it("should default to json", () => {
                const res = response();
                res.body = { foo: "bar" };
                assert(res.header["content-type"] == "application/json; charset=utf-8");
            });
        });
    });
});
