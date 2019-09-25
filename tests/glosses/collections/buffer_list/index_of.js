const {
    collection: { BufferList }
} = adone;

describe("indexOf", () => {
    it("indexOf single byte needle", () => {
        const bl = new BufferList(["abcdefg", "abcdefg", "12345"]);

        assert.equal(bl.indexOf("e"), 4);
        assert.equal(bl.indexOf("e", 5), 11);
        assert.equal(bl.indexOf("e", 12), -1);
        assert.equal(bl.indexOf("5"), 18);
    });

    it("indexOf multiple byte needle", () => {
        const bl = new BufferList(["abcdefg", "abcdefg"]);

        assert.equal(bl.indexOf("ef"), 4);
        assert.equal(bl.indexOf("ef", 5), 11);
    });

    it("indexOf multiple byte needles across buffer boundaries", () => {
        const bl = new BufferList(["abcdefg", "abcdefg"]);

        assert.equal(bl.indexOf("fgabc"), 5);
    });

    it("indexOf takes a Uint8Array search", () => {
        const bl = new BufferList(["abcdefg", "abcdefg"]);
        const search = new Uint8Array([102, 103, 97, 98, 99]); // fgabc

        assert.equal(bl.indexOf(search), 5);
    });

    it("indexOf takes a buffer list search", () => {
        const bl = new BufferList(["abcdefg", "abcdefg"]);
        const search = new BufferList("fgabc");

        assert.equal(bl.indexOf(search), 5);
    });

    it("indexOf a zero byte needle", () => {
        const b = new BufferList("abcdef");
        const bufEmpty = Buffer.from("");

        assert.equal(b.indexOf(""), 0);
        assert.equal(b.indexOf("", 1), 1);
        assert.equal(b.indexOf("", b.length + 1), b.length);
        assert.equal(b.indexOf("", Infinity), b.length);
        assert.equal(b.indexOf(bufEmpty), 0);
        assert.equal(b.indexOf(bufEmpty, 1), 1);
        assert.equal(b.indexOf(bufEmpty, b.length + 1), b.length);
        assert.equal(b.indexOf(bufEmpty, Infinity), b.length);
    });

    it("indexOf buffers smaller and larger than the needle", () => {
        const bl = new BufferList(["abcdefg", "a", "bcdefg", "a", "bcfgab"]);

        assert.equal(bl.indexOf("fgabc"), 5);
        assert.equal(bl.indexOf("fgabc", 6), 12);
        assert.equal(bl.indexOf("fgabc", 13), -1);
    })

    // only present in node 6+
    ; (process.version.substr(1).split(".")[0] >= 6) && it("indexOf latin1 and binary encoding", () => {
        const b = new BufferList("abcdef");

        // test latin1 encoding
        assert.equal(
            new BufferList(Buffer.from(b.toString("latin1"), "latin1"))
                .indexOf("d", 0, "latin1"),
            3
        );
        assert.equal(
            new BufferList(Buffer.from(b.toString("latin1"), "latin1"))
                .indexOf(Buffer.from("d", "latin1"), 0, "latin1"),
            3
        );
        assert.equal(
            new BufferList(Buffer.from("aa\u00e8aa", "latin1"))
                .indexOf("\u00e8", "latin1"),
            2
        );
        assert.equal(
            new BufferList(Buffer.from("\u00e8", "latin1"))
                .indexOf("\u00e8", "latin1"),
            0
        );
        assert.equal(
            new BufferList(Buffer.from("\u00e8", "latin1"))
                .indexOf(Buffer.from("\u00e8", "latin1"), "latin1"),
            0
        );

        // test binary encoding
        assert.equal(
            new BufferList(Buffer.from(b.toString("binary"), "binary"))
                .indexOf("d", 0, "binary"),
            3
        );
        assert.equal(
            new BufferList(Buffer.from(b.toString("binary"), "binary"))
                .indexOf(Buffer.from("d", "binary"), 0, "binary"),
            3
        );
        assert.equal(
            new BufferList(Buffer.from("aa\u00e8aa", "binary"))
                .indexOf("\u00e8", "binary"),
            2
        );
        assert.equal(
            new BufferList(Buffer.from("\u00e8", "binary"))
                .indexOf("\u00e8", "binary"),
            0
        );
        assert.equal(
            new BufferList(Buffer.from("\u00e8", "binary"))
                .indexOf(Buffer.from("\u00e8", "binary"), "binary"),
            0
        );
    });

    it("indexOf the entire nodejs10 buffer test suite", () => {
        const b = new BufferList("abcdef");
        const bufA = Buffer.from("a");
        const bufBc = Buffer.from("bc");
        const bufF = Buffer.from("f");
        const bufZ = Buffer.from("z");

        const stringComparison = "abcdef";

        assert.equal(b.indexOf("a"), 0);
        assert.equal(b.indexOf("a", 1), -1);
        assert.equal(b.indexOf("a", -1), -1);
        assert.equal(b.indexOf("a", -4), -1);
        assert.equal(b.indexOf("a", -b.length), 0);
        assert.equal(b.indexOf("a", NaN), 0);
        assert.equal(b.indexOf("a", -Infinity), 0);
        assert.equal(b.indexOf("a", Infinity), -1);
        assert.equal(b.indexOf("bc"), 1);
        assert.equal(b.indexOf("bc", 2), -1);
        assert.equal(b.indexOf("bc", -1), -1);
        assert.equal(b.indexOf("bc", -3), -1);
        assert.equal(b.indexOf("bc", -5), 1);
        assert.equal(b.indexOf("bc", NaN), 1);
        assert.equal(b.indexOf("bc", -Infinity), 1);
        assert.equal(b.indexOf("bc", Infinity), -1);
        assert.equal(b.indexOf("f"), b.length - 1);
        assert.equal(b.indexOf("z"), -1);

        // empty search tests
        assert.equal(b.indexOf(bufA), 0);
        assert.equal(b.indexOf(bufA, 1), -1);
        assert.equal(b.indexOf(bufA, -1), -1);
        assert.equal(b.indexOf(bufA, -4), -1);
        assert.equal(b.indexOf(bufA, -b.length), 0);
        assert.equal(b.indexOf(bufA, NaN), 0);
        assert.equal(b.indexOf(bufA, -Infinity), 0);
        assert.equal(b.indexOf(bufA, Infinity), -1);
        assert.equal(b.indexOf(bufBc), 1);
        assert.equal(b.indexOf(bufBc, 2), -1);
        assert.equal(b.indexOf(bufBc, -1), -1);
        assert.equal(b.indexOf(bufBc, -3), -1);
        assert.equal(b.indexOf(bufBc, -5), 1);
        assert.equal(b.indexOf(bufBc, NaN), 1);
        assert.equal(b.indexOf(bufBc, -Infinity), 1);
        assert.equal(b.indexOf(bufBc, Infinity), -1);
        assert.equal(b.indexOf(bufF), b.length - 1);
        assert.equal(b.indexOf(bufZ), -1);
        assert.equal(b.indexOf(0x61), 0);
        assert.equal(b.indexOf(0x61, 1), -1);
        assert.equal(b.indexOf(0x61, -1), -1);
        assert.equal(b.indexOf(0x61, -4), -1);
        assert.equal(b.indexOf(0x61, -b.length), 0);
        assert.equal(b.indexOf(0x61, NaN), 0);
        assert.equal(b.indexOf(0x61, -Infinity), 0);
        assert.equal(b.indexOf(0x61, Infinity), -1);
        assert.equal(b.indexOf(0x0), -1);

        // test offsets
        assert.equal(b.indexOf("d", 2), 3);
        assert.equal(b.indexOf("f", 5), 5);
        assert.equal(b.indexOf("f", -1), 5);
        assert.equal(b.indexOf("f", 6), -1);

        assert.equal(b.indexOf(Buffer.from("d"), 2), 3);
        assert.equal(b.indexOf(Buffer.from("f"), 5), 5);
        assert.equal(b.indexOf(Buffer.from("f"), -1), 5);
        assert.equal(b.indexOf(Buffer.from("f"), 6), -1);

        assert.equal(Buffer.from("ff").indexOf(Buffer.from("f"), 1, "ucs2"), -1);

        // test invalid and uppercase encoding
        assert.equal(b.indexOf("b", "utf8"), 1);
        assert.equal(b.indexOf("b", "UTF8"), 1);
        assert.equal(b.indexOf("62", "HEX"), 1);
        assert.throws(() => b.indexOf("bad", "enc"), TypeError);

        // test hex encoding
        assert.equal(
            Buffer.from(b.toString("hex"), "hex")
                .indexOf("64", 0, "hex"),
            3
        );
        assert.equal(
            Buffer.from(b.toString("hex"), "hex")
                .indexOf(Buffer.from("64", "hex"), 0, "hex"),
            3
        );

        // test base64 encoding
        assert.equal(
            Buffer.from(b.toString("base64"), "base64")
                .indexOf("ZA==", 0, "base64"),
            3
        );
        assert.equal(
            Buffer.from(b.toString("base64"), "base64")
                .indexOf(Buffer.from("ZA==", "base64"), 0, "base64"),
            3
        );

        // test ascii encoding
        assert.equal(
            Buffer.from(b.toString("ascii"), "ascii")
                .indexOf("d", 0, "ascii"),
            3
        );
        assert.equal(
            Buffer.from(b.toString("ascii"), "ascii")
                .indexOf(Buffer.from("d", "ascii"), 0, "ascii"),
            3
        );

        // test optional offset with passed encoding
        assert.equal(Buffer.from("aaaa0").indexOf("30", "hex"), 4);
        assert.equal(Buffer.from("aaaa00a").indexOf("3030", "hex"), 4);

        {
            // test usc2 encoding
            const twoByteString = Buffer.from("\u039a\u0391\u03a3\u03a3\u0395", "ucs2");

            assert.equal(8, twoByteString.indexOf("\u0395", 4, "ucs2"));
            assert.equal(6, twoByteString.indexOf("\u03a3", -4, "ucs2"));
            assert.equal(4, twoByteString.indexOf("\u03a3", -6, "ucs2"));
            assert.equal(4, twoByteString.indexOf(
                Buffer.from("\u03a3", "ucs2"), -6, "ucs2"));
            assert.equal(-1, twoByteString.indexOf("\u03a3", -2, "ucs2"));
        }

        const mixedByteStringUcs2 =
            Buffer.from("\u039a\u0391abc\u03a3\u03a3\u0395", "ucs2");

        assert.equal(6, mixedByteStringUcs2.indexOf("bc", 0, "ucs2"));
        assert.equal(10, mixedByteStringUcs2.indexOf("\u03a3", 0, "ucs2"));
        assert.equal(-1, mixedByteStringUcs2.indexOf("\u0396", 0, "ucs2"));

        assert.equal(
            6, mixedByteStringUcs2.indexOf(Buffer.from("bc", "ucs2"), 0, "ucs2"));
        assert.equal(
            10, mixedByteStringUcs2.indexOf(Buffer.from("\u03a3", "ucs2"), 0, "ucs2"));
        assert.equal(
            -1, mixedByteStringUcs2.indexOf(Buffer.from("\u0396", "ucs2"), 0, "ucs2"));

        {
            const twoByteString = Buffer.from("\u039a\u0391\u03a3\u03a3\u0395", "ucs2");

            // Test single char pattern
            assert.equal(0, twoByteString.indexOf("\u039a", 0, "ucs2"));
            let index = twoByteString.indexOf("\u0391", 0, "ucs2");
            assert.equal(2, index, `Alpha - at index ${index}`);
            index = twoByteString.indexOf("\u03a3", 0, "ucs2");
            assert.equal(4, index, `First Sigma - at index ${index}`);
            index = twoByteString.indexOf("\u03a3", 6, "ucs2");
            assert.equal(6, index, `Second Sigma - at index ${index}`);
            index = twoByteString.indexOf("\u0395", 0, "ucs2");
            assert.equal(8, index, `Epsilon - at index ${index}`);
            index = twoByteString.indexOf("\u0392", 0, "ucs2");
            assert.equal(-1, index, `Not beta - at index ${index}`);

            // Test multi-char pattern
            index = twoByteString.indexOf("\u039a\u0391", 0, "ucs2");
            assert.equal(0, index, `Lambda Alpha - at index ${index}`);
            index = twoByteString.indexOf("\u0391\u03a3", 0, "ucs2");
            assert.equal(2, index, `Alpha Sigma - at index ${index}`);
            index = twoByteString.indexOf("\u03a3\u03a3", 0, "ucs2");
            assert.equal(4, index, `Sigma Sigma - at index ${index}`);
            index = twoByteString.indexOf("\u03a3\u0395", 0, "ucs2");
            assert.equal(6, index, `Sigma Epsilon - at index ${index}`);
        }

        const mixedByteStringUtf8 = Buffer.from("\u039a\u0391abc\u03a3\u03a3\u0395");

        assert.equal(5, mixedByteStringUtf8.indexOf("bc"));
        assert.equal(5, mixedByteStringUtf8.indexOf("bc", 5));
        assert.equal(5, mixedByteStringUtf8.indexOf("bc", -8));
        assert.equal(7, mixedByteStringUtf8.indexOf("\u03a3"));
        assert.equal(-1, mixedByteStringUtf8.indexOf("\u0396"));

        // Test complex string indexOf algorithms. Only trigger for long strings.
        // Long string that isn't a simple repeat of a shorter string.
        let longString = "A";
        for (let i = 66; i < 76; i++) { // from 'B' to 'K'
            longString = longString + String.fromCharCode(i) + longString;
        }

        const longBufferString = Buffer.from(longString);

        // pattern of 15 chars, repeated every 16 chars in long
        let pattern = "ABACABADABACABA";
        for (let i = 0; i < longBufferString.length - pattern.length; i += 7) {
            const index = longBufferString.indexOf(pattern, i);
            assert.equal((i + 15) & ~0xf, index,
                `Long ABACABA...-string at index ${i}`);
        }

        let index = longBufferString.indexOf("AJABACA");
        assert.equal(510, index, `Long AJABACA, First J - at index ${index}`);
        index = longBufferString.indexOf("AJABACA", 511);
        assert.equal(1534, index, `Long AJABACA, Second J - at index ${index}`);

        pattern = "JABACABADABACABA";
        index = longBufferString.indexOf(pattern);
        assert.equal(511, index, `Long JABACABA..., First J - at index ${index}`);
        index = longBufferString.indexOf(pattern, 512);
        assert.equal(
            1535, index, `Long JABACABA..., Second J - at index ${index}`);

        // Search for a non-ASCII string in a pure ASCII string.
        const asciiString = Buffer.from(
            "arglebargleglopglyfarglebargleglopglyfarglebargleglopglyf");
        assert.equal(-1, asciiString.indexOf("\x2061"));
        assert.equal(3, asciiString.indexOf("leb", 0));

        // Search in string containing many non-ASCII chars.
        const allCodePoints = [];
        for (let i = 0; i < 65536; i++) {
            allCodePoints[i] = i;
        }

        const allCharsString = String.fromCharCode.apply(String, allCodePoints);
        const allCharsBufferUtf8 = Buffer.from(allCharsString);
        const allCharsBufferUcs2 = Buffer.from(allCharsString, "ucs2");

        // Search for string long enough to trigger complex search with ASCII pattern
        // and UC16 subject.
        assert.equal(-1, allCharsBufferUtf8.indexOf("notfound"));
        assert.equal(-1, allCharsBufferUcs2.indexOf("notfound"));

        // Needle is longer than haystack, but only because it's encoded as UTF-16
        assert.equal(Buffer.from("aaaa").indexOf("a".repeat(4), "ucs2"), -1);

        assert.equal(Buffer.from("aaaa").indexOf("a".repeat(4), "utf8"), 0);
        assert.equal(Buffer.from("aaaa").indexOf("你好", "ucs2"), -1);

        // Haystack has odd length, but the needle is UCS2.
        assert.equal(Buffer.from("aaaaa").indexOf("b", "ucs2"), -1);

        {
            // Find substrings in Utf8.
            const lengths = [1, 3, 15]; // Single char, simple and complex.
            const indices = [0x5, 0x60, 0x400, 0x680, 0x7ee, 0xFF02, 0x16610, 0x2f77b];
            for (let lengthIndex = 0; lengthIndex < lengths.length; lengthIndex++) {
                for (let i = 0; i < indices.length; i++) {
                    const index = indices[i];
                    let length = lengths[lengthIndex];

                    if (index + length > 0x7F) {
                        length = 2 * length;
                    }

                    if (index + length > 0x7FF) {
                        length = 3 * length;
                    }

                    if (index + length > 0xFFFF) {
                        length = 4 * length;
                    }

                    const patternBufferUtf8 = allCharsBufferUtf8.slice(index, index + length);
                    assert.equal(index, allCharsBufferUtf8.indexOf(patternBufferUtf8));

                    const patternStringUtf8 = patternBufferUtf8.toString();
                    assert.equal(index, allCharsBufferUtf8.indexOf(patternStringUtf8));
                }
            }
        }

        {
            // Find substrings in Usc2.
            const lengths = [2, 4, 16]; // Single char, simple and complex.
            const indices = [0x5, 0x65, 0x105, 0x205, 0x285, 0x2005, 0x2085, 0xfff0];

            for (let lengthIndex = 0; lengthIndex < lengths.length; lengthIndex++) {
                for (let i = 0; i < indices.length; i++) {
                    const index = indices[i] * 2;
                    const length = lengths[lengthIndex];

                    const patternBufferUcs2 =
                        allCharsBufferUcs2.slice(index, index + length);
                    assert.equal(
                        index, allCharsBufferUcs2.indexOf(patternBufferUcs2, 0, "ucs2"));

                    const patternStringUcs2 = patternBufferUcs2.toString("ucs2");
                    assert.equal(
                        index, allCharsBufferUcs2.indexOf(patternStringUcs2, 0, "ucs2"));
                }
            }
        }

        [
            () => { },
            {},
            []
        ].forEach((val) => {
            assert.throws(() => b.indexOf(val), TypeError);
        });

        // Test weird offset arguments.
        // The following offsets coerce to NaN or 0, searching the whole Buffer
        assert.equal(b.indexOf("b", undefined), 1);
        assert.equal(b.indexOf("b", {}), 1);
        assert.equal(b.indexOf("b", 0), 1);
        assert.equal(b.indexOf("b", null), 1);
        assert.equal(b.indexOf("b", []), 1);

        // The following offset coerces to 2, in other words +[2] === 2
        assert.equal(b.indexOf("b", [2]), -1);

        // Behavior should match String.indexOf()
        assert.equal(
            b.indexOf("b", undefined),
            stringComparison.indexOf("b", undefined));
        assert.equal(
            b.indexOf("b", {}),
            stringComparison.indexOf("b", {}));
        assert.equal(
            b.indexOf("b", 0),
            stringComparison.indexOf("b", 0));
        assert.equal(
            b.indexOf("b", null),
            stringComparison.indexOf("b", null));
        assert.equal(
            b.indexOf("b", []),
            stringComparison.indexOf("b", []));
        assert.equal(
            b.indexOf("b", [2]),
            stringComparison.indexOf("b", [2]));

        // test truncation of Number arguments to uint8
        {
            const buf = Buffer.from("this is a test");

            assert.equal(buf.indexOf(0x6973), 3);
            assert.equal(buf.indexOf(0x697320), 4);
            assert.equal(buf.indexOf(0x69732069), 2);
            assert.equal(buf.indexOf(0x697374657374), 0);
            assert.equal(buf.indexOf(0x69737374), 0);
            assert.equal(buf.indexOf(0x69737465), 11);
            assert.equal(buf.indexOf(0x69737465), 11);
            assert.equal(buf.indexOf(-140), 0);
            assert.equal(buf.indexOf(-152), 1);
            assert.equal(buf.indexOf(0xff), -1);
            assert.equal(buf.indexOf(0xffff), -1);
        }

        // Test that Uint8Array arguments are okay.
        {
            const needle = new Uint8Array([0x66, 0x6f, 0x6f]);
            const haystack = new BufferList(Buffer.from("a foo b foo"));
            assert.equal(haystack.indexOf(needle), 2);
        }
    });
});
