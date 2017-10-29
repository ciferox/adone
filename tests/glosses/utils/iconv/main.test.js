describe("util", "iconv", "Generic UTF8-UCS2 tests", () => {
    const { util: { iconv } } = adone;

    const testString = "Hello123!";
    const testStringLatin1 = "Hello123!£Å÷×çþÿ¿®";
    const testStringBase64 = "SGVsbG8xMjMh";
    const testStringHex = "48656c6c6f31323321";

    it("Return values are of correct types", () => {
        assert.ok(iconv.encode(testString, "utf8") instanceof Buffer);

        const s = iconv.decode(Buffer.from(testString), "utf8");
        assert.strictEqual(Object.prototype.toString.call(s), "[object String]");
    });

    it("Internal encodings all correctly encoded/decoded", () => {
        ["utf8", "UTF-8", "UCS2", "binary"].forEach((enc) => {
            assert.strictEqual(iconv.encode(testStringLatin1, enc).toString(enc), testStringLatin1);
            assert.strictEqual(iconv.decode(Buffer.from(testStringLatin1, enc), enc), testStringLatin1);
        });
    });

    it("Base64 correctly encoded/decoded", () => {
        assert.strictEqual(iconv.encode(testStringBase64, "base64").toString("binary"), testString);
        assert.strictEqual(iconv.decode(Buffer.from(testString, "binary"), "base64"), testStringBase64);
    });

    it("Hex correctly encoded/decoded", () => {
        assert.strictEqual(iconv.encode(testStringHex, "hex").toString("binary"), testString);
        assert.strictEqual(iconv.decode(Buffer.from(testString, "binary"), "hex"), testStringHex);
    });

    it("Latin1 correctly encoded/decoded", () => {
        assert.strictEqual(iconv.encode(testStringLatin1, "latin1").toString("binary"), testStringLatin1);
        assert.strictEqual(iconv.decode(Buffer.from(testStringLatin1, "binary"), "latin1"), testStringLatin1);
    });

    it("Convert to string, not buffer (utf8 used)", () => {
        const res = iconv.encode(Buffer.from(testStringLatin1, "utf8"), "utf8");
        assert.ok(res instanceof Buffer);
        assert.strictEqual(res.toString("utf8"), testStringLatin1);
    });

    it("Throws on unknown encodings", () => {
        assert.throws(() => {
            iconv.encode("a", "xxx");
        });
        assert.throws(() => {
            iconv.decode(Buffer.from("a"), "xxx");
        });
    });

    it("Convert non-strings and non-buffers", () => {
        assert.strictEqual(iconv.encode({}, "utf8").toString(), "[object Object]");
        assert.strictEqual(iconv.encode(10, "utf8").toString(), "10");
        assert.strictEqual(iconv.encode(undefined, "utf8").toString(), "");
    });

    it("handles Object & Array prototypes monkey patching", () => {
        // eslint-disable-next-line no-extend-native
        Object.prototype.permits = function () { };
        // eslint-disable-next-line no-extend-native
        Array.prototype.sample2 = function () { };

        iconv._codecDataCache = {}; // Clean up cache so that all encodings are loaded.

        try {
            assert.strictEqual(iconv.decode(Buffer.from("abc"), "gbk"), "abc");
            assert.strictEqual(iconv.decode(Buffer.from("abc"), "win1251"), "abc");
            assert.strictEqual(iconv.decode(Buffer.from("abc"), "utf7"), "abc");
            assert.strictEqual(iconv.decode(Buffer.from("abc"), "utf8"), "abc");

            assert.strictEqual(iconv.encode("abc", "gbk").toString(), "abc");
            assert.strictEqual(iconv.encode("abc", "win1251").toString(), "abc");
            assert.strictEqual(iconv.encode("abc", "utf7").toString(), "abc");
            assert.strictEqual(iconv.encode("abc", "utf8").toString(), "abc");
        } finally {
            delete Object.prototype.permits;
            delete Array.prototype.sample2;
        }
    });

    it("handles encoding untranslatable characters correctly", () => {
        // Regression #162
        assert.strictEqual(iconv.encode("外国人", "latin1").toString(), "???");
    });
});
