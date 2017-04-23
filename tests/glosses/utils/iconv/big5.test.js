describe("glosses", "utils", "iconv", "big5", () => {
    const { util: { iconv } } = adone;

    const testString = "中文abc"; //unicode contains Big5-code and ascii
    const testStringBig5Buffer = Buffer.from([0xa4, 0xa4, 0xa4, 0xe5, 0x61, 0x62, 0x63]);
    const testString2 = "測試";
    const testStringBig5Buffer2 = Buffer.from([0xb4, 0xfa, 0xb8, 0xd5]);

    it("Big5 correctly encoded/decoded", () => {
        assert.strictEqual(iconv.encode(testString, "big5").toString("hex"), testStringBig5Buffer.toString("hex"));
        assert.strictEqual(iconv.decode(testStringBig5Buffer, "big5"), testString);
        assert.strictEqual(iconv.encode(testString2, "big5").toString("hex"), testStringBig5Buffer2.toString("hex"));
        assert.strictEqual(iconv.decode(testStringBig5Buffer2, "big5"), testString2);
    });

    it("cp950 correctly encoded/decoded", () => {
        assert.strictEqual(iconv.encode(testString, "cp950").toString("hex"), testStringBig5Buffer.toString("hex"));
        assert.strictEqual(iconv.decode(testStringBig5Buffer, "cp950"), testString);
    });

    it("Big5 correctly decodes and encodes characters · and ×", () => {
        // https://github.com/ashtuchkin/iconv-lite/issues/13
        // Reference: http://www.unicode.org/Public/MAPPINGS/VENDORS/MICSFT/WINDOWS/CP950.TXT
        const chars = "·×";
        const big5Chars = Buffer.from([0xA1, 0x50, 0xA1, 0xD1]);
        assert.strictEqual(iconv.encode(chars, "big5").toString("hex"), big5Chars.toString("hex"));
        assert.strictEqual(iconv.decode(big5Chars, "big5"), chars);
    });

    it("Big5 correctly encodes & decodes sequences", () => {
        assert.strictEqual(iconv.encode("\u00CA\u0304", "big5").toString("hex"), "8862");
        assert.strictEqual(iconv.encode("\u00EA\u030C", "big5").toString("hex"), "88a5");
        assert.strictEqual(iconv.encode("\u00CA", "big5").toString("hex"), "8866");
        assert.strictEqual(iconv.encode("\u00CA\u00CA", "big5").toString("hex"), "88668866");

        assert.strictEqual(iconv.encode("\u00CA\uD800", "big5").toString("hex"), "88663f");         // Unfinished surrogate.
        assert.strictEqual(iconv.encode("\u00CA\uD841\uDD47", "big5").toString("hex"), "8866fa40"); // Finished surrogate ('𠕇').
        assert.strictEqual(iconv.encode("\u00CA𠕇", "big5").toString("hex"), "8866fa40");            // Finished surrogate ('𠕇').

        assert.strictEqual(iconv.decode(Buffer.from("8862", "hex"), "big5"), "\u00CA\u0304");
        assert.strictEqual(iconv.decode(Buffer.from("8866", "hex"), "big5"), "\u00CA");
        assert.strictEqual(iconv.decode(Buffer.from("8866fa40", "hex"), "big5"), "\u00CA𠕇");
    });

    it("Big5 correctly encodes 十", () => {
        assert.strictEqual(iconv.encode("十", "big5").toString("hex"), "a451");
    });
});
