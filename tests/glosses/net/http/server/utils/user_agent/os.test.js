describe("net", "http", "server", "util", "user agent", "_", "os", () => {
    const options = {
        usePatchMinor: true
    };

    const { net: { http: { server: { util: { userAgent } } } } } = adone;
    const { _: { UA: OS, PartialParser } } = userAgent;

    describe("os object", () => {
        it("OS constructor with no arguments", () => {
            const os = new OS();
            assert.strictEqual(os.family, "Other");
            assert.strictEqual(os.major, null);
            assert.strictEqual(os.minor, null);
            assert.strictEqual(os.patch, null);
        });

        it("OS constructor with valid arguments", () => {
            const os = new OS("Bar", "4", "3", "2", "1");
            assert.strictEqual(os.family, "Bar");
            assert.strictEqual(os.major, "4");
            assert.strictEqual(os.minor, "3");
            assert.strictEqual(os.patch, "2");
            assert.strictEqual(os.patchMinor, "1");
        });

        it("OS#toVersionString with only numerical args", () => {
            assert.strictEqual(new OS("Bar", "4", "3", "2", "1").toVersionString(), "4.3.2.1");
            assert.strictEqual(new OS("Bar", "4", "3", "2").toVersionString(), "4.3.2");
            assert.strictEqual(new OS("Bar", "4", "3").toVersionString(), "4.3");
            assert.strictEqual(new OS("Bar", "4").toVersionString(), "4");
            assert.strictEqual(new OS("Bar").toVersionString(), "");
        });

        it("OS#toVersionString with non numerical args", () => {
            assert.strictEqual(new OS("Bar", "4", "3", "2", "beta").toVersionString(), "4.3.2beta");
            assert.strictEqual(new OS("Bar", "4", "3", "beta").toVersionString(), "4.3beta");
        });

        it("OS#toString for known OS", () => {
            assert.strictEqual(new OS("Bar", "4", "3", "2", "1").toString(), "Bar 4.3.2.1");
        });

        it("OS#toString for unknown OS", () => {
            assert.strictEqual(new OS().toString(), "Other");
        });
    });

    describe("OS parser", () => {
        it("parser returns a function", () => {
            assert.equal(typeof new PartialParser([]).parse, "function");
        });

        it("Parser returns an instance of OS when unsuccessful at parsing", () => {
            const parser = new PartialParser([], options);
            assert.ok(parser.parse("foo") instanceof OS);
        });

        it("Parser returns an instance of OS when sucessful", () => {
            const parser = new PartialParser([{ regex: "foo" }], options);
            assert.ok(parser.parse("foo") instanceof OS);
        });

        it("Parser correctly identifies OS name", () => {
            const parser = new PartialParser([{ regex: "(foo)" }], options);
            assert.strictEqual(parser.parse("foo").family, "foo");
        });

        it("Parser correctly identifies version numbers", () => {
            const parser = new PartialParser([{ regex: "(foo) (\\d)\\.(\\d).(\\d)\\.(\\d)" }], options);
            const os = parser.parse("foo 1.2.3.4");
            assert.strictEqual(os.family, "foo");
            assert.strictEqual(os.major, "1");
            assert.strictEqual(os.minor, "2");
            assert.strictEqual(os.patch, "3");
            assert.strictEqual(os.patchMinor, "4");
        });

        it("Parser correctly processes replacements", () => {
            const parser = new PartialParser([{
                regex: "(foo) (\\d)\\.(\\d)\\.(\\d)\\.(\\d)",
                family: "$1bar",
                v1: "a",
                v2: "b",
                v3: "c",
                v4: "d"
            }], options);

            const os = parser.parse("foo 1.2.3.4");
            assert.strictEqual(os.family, "foobar");
            assert.strictEqual(os.major, "a");
            assert.strictEqual(os.minor, "b");
            assert.strictEqual(os.patch, "c");
        });
    });
});
