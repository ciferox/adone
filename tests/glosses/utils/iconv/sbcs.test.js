describe("glosses", "utils", "iconv", "Full SBCS encoding tests", function () {
    this.timeout(10000);

    const { util: { iconv }, std: { path }, ExBuffer } = adone;

    const fixtures = new FS.Directory(path.resolve(__dirname, "fixtures"));

    const aliases = {
        armscii8: "ARMSCII-8",
        georgianacademy: "GEORGIAN-ACADEMY",
        georgianps: "GEORGIAN-PS",
        iso646cn: "ISO646-CN",
        iso646jp: "ISO646-JP",
        hproman8: "HP-ROMAN8"
    };

    const iconvAlias = (enc) => {
        let r = /windows(\d+)/.exec(enc);
        if (r) {
            return `WINDOWS-${r[1]}`;
        }
        r = /iso8859(\d+)/.exec(enc);
        if (r) {
            return `ISO8859-${r[1]}`;
        }
        r = /koi8(\w+)/.exec(enc);
        if (r) {
            return `KOI8-${r[1]}`;
        }
        if (aliases[enc]) {
            return aliases[enc];
        }
        return enc;
    };

    const normalizedEncodings = { windows1255: true, windows1258: true, tcvn: true };

    const combClass = { "\u0327": 202, "\u0323": 220, "\u031B": 216 }; // Combining class of unicode characters.
    for (let i = 0x300; i < 0x315; i++) {
        combClass[String.fromCharCode(i)] = 230;
    }

    const iconvEquivChars = {
        cp1163: { Ð: "\u0110", "\u203E": "\u00AF" }
    };


    const swapBytes = (buf) => {
        for (let i = 0; i < buf.length; i += 2) {
            buf.writeUInt16LE(buf.readUInt16BE(i), i);
        } return buf;
    };

    const spacify2 = (str) => {
        return str.replace(/(..)/g, "$1 ").trim();
    };

    const spacify4 = (str) => {
        return str.replace(/(....)/g, "$1 ").trim();
    };

    const strToHex = (str) => {
        return spacify4(swapBytes(new Buffer(str, "ucs2")).toString("hex"));
    };

    // Generate tests for all SBCS encodings.
    iconv.encode("", "utf8"); // Load all encodings.


    for (const enc in iconv.encodings) {
        if (iconv.encodings[enc].type === "_sbcs") {
            (function (enc) {
                const iconvName = iconvAlias(enc);
                const testEncName = enc + ((enc !== iconvName) ? ` (${iconvName})` : "");

                it(`Decode SBCS encoding ${testEncName}`, async function () {
                    const expectedFile = fixtures.getVirtualFile("sbcs", "decode", `${testEncName}.expected`);
                    if (!await expectedFile.exists()) {
                        this.skip();
                        return;
                    }
                    const errors = [];
                    const buffer = ExBuffer.wrap(await expectedFile.content(null));
                    for (let i = 0; i < 0x100; i++) {
                        const buf = new Buffer([i]);
                        const strActual = iconv.decode(buf, enc);


                        const len = buffer.readUInt8();
                        let strExpected = buffer.read(len).toBuffer();

                        if (strExpected.length === 0) {
                            strExpected = iconv.defaultCharUnicode;
                        }

                        strExpected = strExpected.toString();

                        if (strActual !== strExpected) {
                            errors.push({ input: buf.toString("hex"), strExpected, strActual });
                        }
                    }

                    if (errors.length > 0) {
                        assert.fail(null, null, `Decoding mismatch: <input> | <expected> | <actual> | <expected char> | <actual char>\n${
                            errors.map((err) => {
                                return `          ${spacify2(err.input)} | ${strToHex(err.strExpected)} | ${strToHex(err.strActual)} | ${
                                    err.strExpected} | ${err.strActual}`;
                            }).join("\n")}\n       `);
                    }
                });

                it(`Encode SBCS encoding ${testEncName}`, async function () {
                    const expectedFile = fixtures.getVirtualFile("sbcs", "encode", `${testEncName}.expected`);
                    if (!await expectedFile.exists()) {
                        this.skip();
                        return;
                    }
                    const errors = [];
                    const buffer = ExBuffer.wrap(await expectedFile.content(null));
                    for (let i = 0; i < 0xFFF0; i++) {
                        if (i === 0xD800) {
                            i = 0xF900;
                        } // Skip surrogates & private use

                        const str = String.fromCharCode(i);

                        const len = buffer.readUInt8();
                        let strExpected = buffer.read(len).toBuffer();

                        if (strExpected.length === 0) {
                            strExpected = new Buffer(iconv.defaultCharSingleByte);
                        }

                        strExpected = strExpected.toString("hex");

                        const strActual = iconv.encode(str, enc).toString("hex");

                        if (strExpected === strActual) {
                            continue;
                        }

                        // We are not supporting unicode normalization/decomposition of input, so skip it.
                        // (when single unicode char results in >1 encoded chars because of diacritics)
                        if (normalizedEncodings[enc] && strActual === iconv.defaultCharSingleByte.charCodeAt(0).toString(16)) {
                            // const strDenormStrict = unorm.nfd(str); // Strict decomposition
                            const strDenormStrict = str.normalize("NFD"); // Strict decomposition
                            if (strExpected === iconv.encode(strDenormStrict, enc).toString("hex")) {
                                continue;
                            }

                            // const strDenorm = unorm.nfkd(str); // Check also compat decomposition.
                            const strDenorm = str.normalize("NFKD"); // Check also compat decomposition.
                            if (strExpected === iconv.encode(strDenorm, enc).toString("hex")) {
                                continue;
                            }

                            // Try semicomposition if we have 2 combining characters.
                            if (strDenorm.length === 3 && !combClass[strDenorm[0]] && combClass[strDenorm[1]] && combClass[strDenorm[2]]) {
                                // Semicompose without swapping.
                                const strDenorm2 = (strDenorm[0] + strDenorm[1]).normalize("NFC") + strDenorm[2];
                                if (strExpected === iconv.encode(strDenorm2, enc).toString("hex")) {
                                    continue;
                                }

                                // Swap combining characters if they have different combining classes, making swap unicode-equivalent.
                                // const strDenorm3 = unorm.nfc(strDenorm[0] + strDenorm[2]) + strDenorm[1];
                                const strDenorm3 = (strDenorm[0] + strDenorm[2]).normalize("NFC") + strDenorm[1];
                                if (strExpected === iconv.encode(strDenorm3, enc).toString("hex")) {
                                    if (combClass[strDenorm[1]] !== combClass[strDenorm[2]]) {
                                        continue;
                                    } else {
                                        // In theory, if combining classes are the same, we can not swap them. But iconv thinks otherwise.
                                        // So we skip this too.
                                        continue;
                                    }
                                }
                            }
                        }

                        // Iconv sometimes treats some characters as equivalent. Check it and skip.
                        if (iconvEquivChars[enc] && iconvEquivChars[enc][str] &&
                            strExpected === iconv.encode(iconvEquivChars[enc][str], enc).toString("hex")) {
                            continue;
                        }

                        errors.push({ input: strToHex(str), inputChar: str, strExpected, strActual });
                    }

                    if (errors.length > 0) {
                        assert.fail(null, null, `Encoding mismatch: <input> | <input char> | <expected> | <actual>\n${
                            errors.map((err) => {
                                return `          ${err.input} | ${err.inputChar} | ${spacify2(err.strExpected)} | ${spacify2(err.strActual)}`;
                            }).join("\n")}\n       `);
                    }
                });

                /*
                // TODO: Implement unicode composition. After that, this test will be meaningful.

                // Create a large random text.
                var buf2 = new Buffer(100);
                for (var i = 0; i < buf2.length; i++)
                    buf2[i] = buf[(Math.random()*buf.length) | 0];

                // Check both encoding and decoding.
                assert.strictEqual(JSON.stringify(iconv.decode(buf2, enc)), JSON.stringify(str = conv.convert(buf2).toString()));
                assert.strictEqual(iconv.encode(str, enc).toString('hex'), convBack.convert(new Buffer(str)).toString('hex'));
                */
            })(enc);
        }
    }
});

