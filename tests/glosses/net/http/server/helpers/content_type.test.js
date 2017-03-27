describe("glosses", "net", "http", "helpers", "content type", () => {
    const { contentType } = adone.net.http.server.helper;

    describe("parse", () => {

        const invalidTypes = [
            " ",
            "null",
            "undefined",
            "/",
            "text / plain",
            "text/;plain",
            'text/"plain"',
            "text/p£ain",
            "text/(plain)",
            "text/@plain",
            "text/plain,wrong"
        ];

        describe("contentType.parse(string)", () => {
            it("should parse basic type", () => {
                const type = contentType.parse("text/html");
                assert.equal(type.type, "text/html");
            });

            it("should parse with suffix", () => {
                const type = contentType.parse("image/svg+xml");
                assert.equal(type.type, "image/svg+xml");
            });

            it("should parse basic type with surrounding OWS", () => {
                const type = contentType.parse(" text/html ");
                assert.equal(type.type, "text/html");
            });

            it("should parse parameters", () => {
                const type = contentType.parse("text/html; charset=utf-8; foo=bar");
                assert.equal(type.type, "text/html");
                assert.deepEqual(type.parameters, {
                    charset: "utf-8",
                    foo: "bar"
                });
            });

            it("should parse parameters with extra LWS", () => {
                const type = contentType.parse("text/html ; charset=utf-8 ; foo=bar");
                assert.equal(type.type, "text/html");
                assert.deepEqual(type.parameters, {
                    charset: "utf-8",
                    foo: "bar"
                });
            });

            it("should lower-case type", () => {
                const type = contentType.parse("IMAGE/SVG+XML");
                assert.equal(type.type, "image/svg+xml");
            });

            it("should lower-case parameter names", () => {
                const type = contentType.parse("text/html; Charset=UTF-8");
                assert.equal(type.type, "text/html");
                assert.deepEqual(type.parameters, {
                    charset: "UTF-8"
                });
            });

            it("should unquote parameter values", () => {
                const type = contentType.parse('text/html; charset="UTF-8"');
                assert.equal(type.type, "text/html");
                assert.deepEqual(type.parameters, {
                    charset: "UTF-8"
                });
            });

            it("should unquote parameter values with escapes", () => {
                const type = contentType.parse('text/html; charset = "UT\\F-\\\\\\"8\\""');
                assert.equal(type.type, "text/html");
                assert.deepEqual(type.parameters, {
                    charset: 'UTF-\\"8"'
                });
            });

            it("should handle balanced quotes", () => {
                const type = contentType.parse('text/html; param="charset=\\"utf-8\\"; foo=bar"; bar=foo');
                assert.equal(type.type, "text/html");
                assert.deepEqual(type.parameters, {
                    param: 'charset="utf-8"; foo=bar',
                    bar: "foo"
                });
            });

            invalidTypes.forEach((type) => {
                it(`should throw on invalid media type ${type}`, () => {
                    assert.throws(contentType.parse.bind(null, type), /invalid media type/);
                });
            });

            it("should throw on invalid parameter format", () => {
                assert.throws(contentType.parse.bind(null, 'text/plain; foo="bar'), /invalid parameter format/);
                assert.throws(contentType.parse.bind(null, "text/plain; profile=http://localhost; foo=bar"), /invalid parameter format/);
                assert.throws(contentType.parse.bind(null, "text/plain; profile=http://localhost"), /invalid parameter format/);
            });

            it("should require argument", () => {
                assert.throws(contentType.parse.bind(null), /string.*required/);
            });

            it("should reject non-strings", () => {
                assert.throws(contentType.parse.bind(null, 7), /string.*required/);
            });
        });

        describe("contentType.parse(req)", () => {
            it("should parse content-type header", () => {
                const req = { headers: { "content-type": "text/html" } };
                const type = contentType.parse(req);
                assert.equal(type.type, "text/html");
            });

            it("should reject objects without headers property", () => {
                assert.throws(contentType.parse.bind(null, {}), /content-type header is missing/);
            });

            it("should reject missing content-type", () => {
                const req = { headers: {} };
                assert.throws(contentType.parse.bind(null, req), /content-type header is missing/);
            });
        });

        describe("contentType.parse(res)", () => {
            it("should parse content-type header", () => {
                const res = {
                    getHeader() {
                        return "text/html";
                    }
                };
                const type = contentType.parse(res);
                assert.equal(type.type, "text/html");
            });

            it("should reject objects without getHeader method", () => {
                assert.throws(contentType.parse.bind(null, {}), /content-type header is missing/);
            });

            it("should reject missing content-type", () => {
                const res = { getHeader() { } };
                assert.throws(contentType.parse.bind(null, res), /content-type header is missing/);
            });
        });
    });

    describe("format", () => {
        describe("contentType.format(obj)", () => {
            it("should format basic type", () => {
                const str = contentType.format({ type: "text/html" });
                assert.equal(str, "text/html");
            });

            it("should format type with suffix", () => {
                const str = contentType.format({ type: "image/svg+xml" });
                assert.equal(str, "image/svg+xml");
            });

            it("should format type with parameter", () => {
                const str = contentType.format({
                    type: "text/html",
                    parameters: { charset: "utf-8" }
                });
                assert.equal(str, "text/html; charset=utf-8");
            });

            it("should format type with parameter that needs quotes", () => {
                const str = contentType.format({
                    type: "text/html",
                    parameters: { foo: 'bar or "baz"' }
                });
                assert.equal(str, 'text/html; foo="bar or \\"baz\\""');
            });

            it("should format type with parameter with empty value", () => {
                const str = contentType.format({
                    type: "text/html",
                    parameters: { foo: "" }
                });
                assert.equal(str, 'text/html; foo=""');
            });

            it("should format type with multiple parameters", () => {
                const str = contentType.format({
                    type: "text/html",
                    parameters: { charset: "utf-8", foo: "bar", bar: "baz" }
                });
                assert.equal(str, "text/html; bar=baz; charset=utf-8; foo=bar");
            });

            it("should require argument", () => {
                assert.throws(contentType.format.bind(null), /argument obj is required/);
            });

            it("should reject non-objects", () => {
                assert.throws(contentType.format.bind(null, 7), /argument obj is required/);
            });

            it("should require type", () => {
                const obj = {};
                assert.throws(contentType.format.bind(null, obj), /invalid type/);
            });

            it("should reject invalid type", () => {
                const obj = { type: "text/" };
                assert.throws(contentType.format.bind(null, obj), /invalid type/);
            });

            it("should reject invalid type with LWS", () => {
                const obj = { type: " text/html" };
                assert.throws(contentType.format.bind(null, obj), /invalid type/);
            });

            it("should reject invalid parameter name", () => {
                const obj = { type: "image/svg", parameters: { "foo/": "bar" } };
                assert.throws(contentType.format.bind(null, obj), /invalid parameter name/);
            });

            it("should reject invalid parameter value", () => {
                const obj = { type: "image/svg", parameters: { foo: "bar\u0000" } };
                assert.throws(contentType.format.bind(null, obj), /invalid parameter value/);
            });
        });
    });
});
