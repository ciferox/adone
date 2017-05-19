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

        it("should lower-case type", () => {
            const type = mediaTyper.parse("IMAGE/SVG+XML");
            assert.equal(type.type, "image");
            assert.equal(type.subtype, "svg");
            assert.equal(type.suffix, "xml");
        });

        invalidTypes.forEach((type) => {
            it(`should throw on invalid media type ${type}`, () => {
                assert.throws(mediaTyper.parse.bind(null, type), /invalid media type/);
            });
        });

        it("should require argument", () => {
            assert.throws(mediaTyper.parse.bind(null), /string.*required/);
        });

        it("should reject non-strings", () => {
            assert.throws(mediaTyper.parse.bind(null, 7), /string.*required/);
        });
    });
});
