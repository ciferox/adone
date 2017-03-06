describe("glosses", "utils", "iconv", "GBK tests", () => {
    const { util: { iconv }, std: { path } } = adone;

    const fixtures = new FS.Directory(path.resolve(__dirname, "fixtures"));
    const testString = "中国abc"; //unicode contains GBK-code and ascii
    const testStringGBKBuffer = new Buffer([0xd6, 0xd0, 0xb9, 0xfa, 0x61, 0x62, 0x63]);


    it("GBK correctly encoded/decoded", () => {
        assert.strictEqual(iconv.encode(testString, "GBK").toString("binary"), testStringGBKBuffer.toString("binary"));
        assert.strictEqual(iconv.decode(testStringGBKBuffer, "GBK"), testString);
    });

    it("GB2312 correctly encoded/decoded", () => {
        assert.strictEqual(iconv.encode(testString, "GB2312").toString("binary"), testStringGBKBuffer.toString("binary"));
        assert.strictEqual(iconv.decode(testStringGBKBuffer, "GB2312"), testString);
    });

    it("GBK file read decoded,compare with iconv result", async () => {
        const contentBuffer = await fixtures.getVirtualFile("gbkfile.txt").content(null);
        const str = iconv.decode(contentBuffer, "GBK");
        const expected = await fixtures.getVirtualFile("gbkfile.txt.expected").content();
        assert.strictEqual(expected, str);
    });

    it("GBK correctly decodes and encodes characters · and ×", () => {
        // https://github.com/ashtuchkin/iconv-lite/issues/13
        // Reference: http://www.unicode.org/Public/MAPPINGS/VENDORS/MICSFT/WINDOWS/CP936.TXT
        const chars = "·×";
        const gbkChars = new Buffer([0xA1, 0xA4, 0xA1, 0xC1]);
        assert.strictEqual(iconv.encode(chars, "GBK").toString("binary"), gbkChars.toString("binary"));
        assert.strictEqual(iconv.decode(gbkChars, "GBK"), chars);
    });

    it("GBK and GB18030 correctly decodes and encodes Euro character", () => {
        // Euro character (U+20AC) has two encodings in GBK family: 0x80 and 0xA2 0xE3
        // According to W3C's technical recommendation (https://www.w3.org/TR/encoding/#gbk-encoder),
        // Both GBK and GB18030 decoders should accept both encodings.
        const gbkEuroEncoding1 = new Buffer([0x80]);
        const gbkEuroEncoding2 = new Buffer([0xA2, 0xE3]);
        const strEuro = "€";

        assert.strictEqual(iconv.decode(gbkEuroEncoding1, "GBK"), strEuro);
        assert.strictEqual(iconv.decode(gbkEuroEncoding2, "GBK"), strEuro);
        assert.strictEqual(iconv.decode(gbkEuroEncoding1, "GB18030"), strEuro);
        assert.strictEqual(iconv.decode(gbkEuroEncoding2, "GB18030"), strEuro);

        // But when decoding, GBK should produce 0x80, but GB18030 - 0xA2 0xE3.
        assert.strictEqual(iconv.encode(strEuro, "GBK").toString("hex"), gbkEuroEncoding1.toString("hex"));
        assert.strictEqual(iconv.encode(strEuro, "GB18030").toString("hex"), gbkEuroEncoding2.toString("hex"));
    });

    it("GB18030 findIdx works correctly", () => {
        const findIdxAlternative = (table, val) => {
            for (let i = 0; i < table.length; i++)                {
                if (table[i] > val)                    {
                    return i - 1;
                }
            }
            return table.length - 1;
        };

        const codec = iconv.getEncoder("gb18030");

        for (let i = 0; i < 0x100; i++)            {
            assert.strictEqual(codec.findIdx(codec.gb18030.uChars, i), findIdxAlternative(codec.gb18030.uChars, i), i);
        }

        const tests = [0xFFFF, 0x10000, 0x10001, 0x30000];
        for (let i = 0; i < tests.length; i++)            {
            assert.strictEqual(codec.findIdx(codec.gb18030.uChars, tests[i]), findIdxAlternative(codec.gb18030.uChars, tests[i]), tests[i]);
        }
    });

    const swapBytes = (buf) => {
        for (let i = 0; i < buf.length; i += 2) {
            buf.writeUInt16LE(buf.readUInt16BE(i), i);
        } return buf;
    };

    const spacify4 = (str) => {
        return str.replace(/(....)/g, "$1 ").trim();
    };

    const strToHex = (str) => {
        return spacify4(swapBytes(new Buffer(str, "ucs2")).toString("hex"));
    };

    it("GB18030 encodes/decodes 4 byte sequences", () => {
        const chars = {
            "\u0080": new Buffer([0x81, 0x30, 0x81, 0x30]),
            "\u0081": new Buffer([0x81, 0x30, 0x81, 0x31]),
            "\u008b": new Buffer([0x81, 0x30, 0x82, 0x31]),
            "\u0615": new Buffer([0x81, 0x31, 0x82, 0x31]),
            㦟: new Buffer([0x82, 0x31, 0x82, 0x31]),
            "\udbd9\ude77": new Buffer([0xE0, 0x31, 0x82, 0x31])
        };
        for (const uChar in chars) {
            const gbkBuf = chars[uChar];
            assert.strictEqual(iconv.encode(uChar, "GB18030").toString("hex"), gbkBuf.toString("hex"));
            assert.strictEqual(strToHex(iconv.decode(gbkBuf, "GB18030")), strToHex(uChar));
        }
    });

    it("GB18030 correctly decodes incomplete 4 byte sequences", () => {
        const chars = {
            "�": new Buffer([0x82]),
            "�1": new Buffer([0x82, 0x31]),
            "�1�": new Buffer([0x82, 0x31, 0x82]),
            㦟: new Buffer([0x82, 0x31, 0x82, 0x31]),
            "� ": new Buffer([0x82, 0x20]),
            "�1 ": new Buffer([0x82, 0x31, 0x20]),
            "�1� ": new Buffer([0x82, 0x31, 0x82, 0x20]),
            "\u399f ": new Buffer([0x82, 0x31, 0x82, 0x31, 0x20]),
            "�1\u4fdb": new Buffer([0x82, 0x31, 0x82, 0x61]),
            "�1\u5010\u0061": new Buffer([0x82, 0x31, 0x82, 0x82, 0x61]),
            㦟俛: new Buffer([0x82, 0x31, 0x82, 0x31, 0x82, 0x61]),
            "�1\u50101�1": new Buffer([0x82, 0x31, 0x82, 0x82, 0x31, 0x82, 0x31])
        };
        for (const uChar in chars) {
            const gbkBuf = chars[uChar];
            assert.strictEqual(strToHex(iconv.decode(gbkBuf, "GB18030")), strToHex(uChar));
        }
    });

});
