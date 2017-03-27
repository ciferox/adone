describe("glosses", "net", "http", "helpers", "media typer", () => {
    const { net: { http: { server: { helper: { mediaTyper } } } } } = adone;

    const invalidTypes = [
        " ",
        "null",
        "undefined",
        "/",
        "text/;plain",
        'text/"plain"',
        "text/p£ain",
        "text/(plain)",
        "text/@plain",
        "text/plain,wrong"
    ];

    describe("format", () => {
        it("should format basic type", () => {
            const str = mediaTyper.format({ type: "text", subtype: "html" });
            assert.equal(str, "text/html");
        });

        it("should format type with suffix", () => {
            const str = mediaTyper.format({ type: "image", subtype: "svg", suffix: "xml" });
            assert.equal(str, "image/svg+xml");
        });

        it("should format type with parameter", () => {
            const str = mediaTyper.format({
                type: "text",
                subtype: "html",
                parameters: { charset: "utf-8" }
            });
            assert.equal(str, "text/html; charset=utf-8");
        });

        it("should format type with parameter that needs quotes", () => {
            const str = mediaTyper.format({
                type: "text",
                subtype: "html",
                parameters: { foo: 'bar or "baz"' }
            });
            assert.equal(str, 'text/html; foo="bar or \\"baz\\""');
        });

        it("should format type with parameter with empty value", () => {
            const str = mediaTyper.format({
                type: "text",
                subtype: "html",
                parameters: { foo: "" }
            });
            assert.equal(str, 'text/html; foo=""');
        });

        it("should format type with multiple parameters", () => {
            const str = mediaTyper.format({
                type: "text",
                subtype: "html",
                parameters: { charset: "utf-8", foo: "bar", bar: "baz" }
            });
            assert.equal(str, "text/html; bar=baz; charset=utf-8; foo=bar");
        });

        it("should require argument", () => {
            assert.throws(mediaTyper.format.bind(null), /obj.*required/);
        });

        it("should reject non-objects", () => {
            assert.throws(mediaTyper.format.bind(null, 7), /obj.*required/);
        });

        it("should require type", () => {
            assert.throws(mediaTyper.format.bind(null, {}), /invalid type/);
        });

        it("should reject invalid type", () => {
            assert.throws(mediaTyper.format.bind(null, { type: "text/" }), /invalid type/);
        });

        it("should require subtype", () => {
            assert.throws(mediaTyper.format.bind(null, { type: "text" }), /invalid subtype/);
        });

        it("should reject invalid subtype", () => {
            const obj = { type: "text", subtype: "html/" };
            assert.throws(mediaTyper.format.bind(null, obj), /invalid subtype/);
        });

        it("should reject invalid suffix", () => {
            const obj = { type: "image", subtype: "svg", suffix: "xml\\" };
            assert.throws(mediaTyper.format.bind(null, obj), /invalid suffix/);
        });

        it("should reject invalid parameter name", () => {
            const obj = { type: "image", subtype: "svg", parameters: { "foo/": "bar" } };
            assert.throws(mediaTyper.format.bind(null, obj), /invalid parameter name/);
        });

        it("should reject invalid parameter value", () => {
            const obj = { type: "image", subtype: "svg", parameters: { foo: "bar\u0000" } };
            assert.throws(mediaTyper.format.bind(null, obj), /invalid parameter value/);
        });
    });

    describe("parse", () => {
        it("should parse basic type", () => {
            const type = mediaTyper.parse("text/html");
            assert.equal(type.type, "text");
            assert.equal(type.subtype, "html");
        });

        it("should parse with suffix", () => {
            const type = mediaTyper.parse("image/svg+xml");
            assert.equal(type.type, "image");
            assert.equal(type.subtype, "svg");
            assert.equal(type.suffix, "xml");
        });

        it("should parse parameters", () => {
            const type = mediaTyper.parse("text/html; charset=utf-8; foo=bar");
            assert.equal(type.type, "text");
            assert.equal(type.subtype, "html");
            assert.deepEqual(type.parameters, {
                charset: "utf-8",
                foo: "bar"
            });
        });

        it("should parse parameters with extra LWS", () => {
            const type = mediaTyper.parse("text/html ; charset=utf-8 ; foo=bar");
            assert.equal(type.type, "text");
            assert.equal(type.subtype, "html");
            assert.deepEqual(type.parameters, {
                charset: "utf-8",
                foo: "bar"
            });
        });

        it("should lower-case type", () => {
            const type = mediaTyper.parse("IMAGE/SVG+XML");
            assert.equal(type.type, "image");
            assert.equal(type.subtype, "svg");
            assert.equal(type.suffix, "xml");
        });

        it("should lower-case parameter names", () => {
            const type = mediaTyper.parse("text/html; Charset=UTF-8");
            assert.deepEqual(type.parameters, {
                charset: "UTF-8"
            });
        });

        it("should unquote parameter values", () => {
            const type = mediaTyper.parse('text/html; charset="UTF-8"');
            assert.deepEqual(type.parameters, {
                charset: "UTF-8"
            });
        });

        it("should unquote parameter values with escapes", () => {
            const type = mediaTyper.parse('text/html; charset = "UT\\F-\\\\\\"8\\""');
            assert.deepEqual(type.parameters, {
                charset: 'UTF-\\"8"'
            });
        });

        it("should handle balanced quotes", () => {
            const type = mediaTyper.parse('text/html; param="charset=\\"utf-8\\"; foo=bar"; bar=foo');
            assert.deepEqual(type.parameters, {
                param: 'charset="utf-8"; foo=bar',
                bar: "foo"
            });
        });

        invalidTypes.forEach((type) => {
            it(`should throw on invalid media type ${type}`, () => {
                assert.throws(mediaTyper.parse.bind(null, type), /invalid media type/);
            });
        });

        it("should throw on invalid parameter format", () => {
            assert.throws(mediaTyper.parse.bind(null, 'text/plain; foo="bar'), /invalid parameter format/);
            assert.throws(mediaTyper.parse.bind(null, "text/plain; profile=http://localhost; foo=bar"), /invalid parameter format/);
            assert.throws(mediaTyper.parse.bind(null, "text/plain; profile=http://localhost"), /invalid parameter format/);
        });

        it("should require argument", () => {
            assert.throws(mediaTyper.parse.bind(null), /string.*required/);
        });

        it("should reject non-strings", () => {
            assert.throws(mediaTyper.parse.bind(null, 7), /string.*required/);
        });
    });
});
