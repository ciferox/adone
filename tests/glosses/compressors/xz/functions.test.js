const { compressor: { xz } } = adone;

describe("glosses", "compressors", "xz", () => {
    describe("#versionNumber", () => {
        it("should be present and of number type", () => {
            assert.isOk(xz.versionNumber());
            assert.equal(typeof xz.versionNumber(), "number");
        });
    });

    describe("#versionString", () => {
        it("should be present and of string type", () => {
            assert.isOk(xz.versionNumber());
            assert.equal(typeof xz.versionString(), "string");
        });
    });

    describe("#checkIsSupported", () => {
        it("should at least support no check and crc32", () => {
            assert.strictEqual(true, xz.checkIsSupported(xz.CHECK_NONE));
            assert.strictEqual(true, xz.checkIsSupported(xz.CHECK_CRC32));
        });
        it("should return false for non-existing checks", () => {
            // -1 would be thee bitwise or of all possible checks
            assert.strictEqual(false, xz.checkIsSupported(-1));
        });
    });

    describe("#checkSize", () => {
        it("should be zero for CHECK_NONE", () => {
            assert.strictEqual(0, xz.checkSize(xz.CHECK_NONE));
        });

        it("should be non-zero for crc32", () => {
            assert.isOk(xz.checkSize(xz.CHECK_CRC32) > 0);
        });

        it("should be monotonous", () => {
            assert.isOk(xz.checkSize(xz.CHECK_CRC32 | xz.CHECK_SHA256) >= xz.checkSize(xz.CHECK_CRC32));
        });

        it("should be strictly monotonous if SHA256 is supported", () => {
            assert.isOk(xz.checkSize(xz.CHECK_CRC32 | xz.CHECK_SHA256) > xz.checkSize(xz.CHECK_CRC32) ||
                !xz.checkIsSupported(xz.CHECK_SHA256));
        });
    });

    describe("#filterEncoderIsSupported", () => {
        it("should return true for LZMA1, LZMA2", () => {
            assert.strictEqual(true, xz.filterEncoderIsSupported(xz.FILTER_LZMA1));
            assert.strictEqual(true, xz.filterEncoderIsSupported(xz.FILTER_LZMA2));
        });

        it("should return false for VLI_UNKNOWN", () => {
            assert.strictEqual(false, xz.filterEncoderIsSupported(xz.VLI_UNKNOWN));
        });

        it("should throw for objects which are not convertible to string", () => {
            const badObject = {
                toString() {
                    throw Error("badObject.toString()");
                }
            };
            assert.throws(() => {
                xz.filterEncoderIsSupported(badObject);
            });
        });
    });

    describe("#filterDecoderIsSupported", () => {
        it("should return true for LZMA1, LZMA2", () => {
            assert.strictEqual(true, xz.filterDecoderIsSupported(xz.FILTER_LZMA1));
            assert.strictEqual(true, xz.filterDecoderIsSupported(xz.FILTER_LZMA2));
        });

        it("should return false for VLI_UNKNOWN", () => {
            assert.strictEqual(false, xz.filterDecoderIsSupported(xz.VLI_UNKNOWN));
        });
    });

    describe("#mfIsSupported", () => {
        it("should return true for MF_HC4", () => {
            assert.strictEqual(true, xz.mfIsSupported(xz.MF_HC4));
        });

        it("should return true for a wrong value", () => {
            assert.strictEqual(false, xz.mfIsSupported(-1));
        });
    });

    describe("#modeIsSupported", () => {
        it("should return true for LZMA_MODE_FAST", () => {
            assert.strictEqual(true, xz.modeIsSupported(xz.MODE_FAST));
        });

        it("should return true for a wrong value", () => {
            assert.strictEqual(false, xz.modeIsSupported(-1));
        });
    });

    describe("#lzmaFilterEncoderIsSupported", () => {
        it("should return true for and only for encoding-related filters", () => {
            assert.strictEqual(false, xz.filterEncoderIsSupported());
            assert.strictEqual(false, xz.filterEncoderIsSupported(null));
            assert.strictEqual(false, xz.filterEncoderIsSupported(""));
            assert.strictEqual(false, xz.filterEncoderIsSupported(xz.LZMA_VLI_UNKNOWN));
            assert.strictEqual(true, xz.filterEncoderIsSupported(xz.FILTER_LZMA1));
            assert.strictEqual(true, xz.filterEncoderIsSupported(xz.FILTER_LZMA2));
            assert.strictEqual(true, xz.filterEncoderIsSupported(xz.FILTERS_MAX));
            assert.strictEqual(false, xz.filterEncoderIsSupported(xz.FILTERS_MAX + 1));

            assert.strictEqual("boolean", typeof xz.filterEncoderIsSupported(xz.FILTER_POWERPC));
            assert.strictEqual("boolean", typeof xz.filterEncoderIsSupported(xz.FILTER_IA64));
            assert.strictEqual("boolean", typeof xz.filterEncoderIsSupported(xz.FILTER_ARM));
            assert.strictEqual("boolean", typeof xz.filterEncoderIsSupported(xz.FILTER_ARMTHUMB));
            assert.strictEqual("boolean", typeof xz.filterEncoderIsSupported(xz.FILTER_SPARC));
            assert.strictEqual("boolean", typeof xz.filterEncoderIsSupported(xz.FILTER_DELTA));
        });
    });

    describe("#filterDecoderIsSupported", () => {
        it("should return true for and only for encoding-related filters", () => {
            assert.strictEqual(false, xz.filterDecoderIsSupported());
            assert.strictEqual(false, xz.filterDecoderIsSupported(null));
            assert.strictEqual(false, xz.filterDecoderIsSupported(""));
            assert.strictEqual(false, xz.filterDecoderIsSupported(xz.LZMA_VLI_UNKNOWN));
            assert.strictEqual(true, xz.filterDecoderIsSupported(xz.FILTER_LZMA1));
            assert.strictEqual(true, xz.filterDecoderIsSupported(xz.FILTER_LZMA2));
            assert.strictEqual(true, xz.filterDecoderIsSupported(xz.FILTERS_MAX));
            assert.strictEqual(false, xz.filterDecoderIsSupported(xz.FILTERS_MAX + 1));

            assert.strictEqual("boolean", typeof xz.filterDecoderIsSupported(xz.FILTER_POWERPC));
            assert.strictEqual("boolean", typeof xz.filterDecoderIsSupported(xz.FILTER_IA64));
            assert.strictEqual("boolean", typeof xz.filterDecoderIsSupported(xz.FILTER_ARM));
            assert.strictEqual("boolean", typeof xz.filterDecoderIsSupported(xz.FILTER_ARMTHUMB));
            assert.strictEqual("boolean", typeof xz.filterDecoderIsSupported(xz.FILTER_SPARC));
            assert.strictEqual("boolean", typeof xz.filterDecoderIsSupported(xz.FILTER_DELTA));
        });
    });

    describe("#rawEncoderMemusage", () => {
        it("should be positive for LZMA1, LZMA2", () => {
            assert.isOk(xz.rawEncoderMemusage([{ id: xz.FILTER_LZMA1 }]) > 0);
            assert.isOk(xz.rawEncoderMemusage([{ id: xz.FILTER_LZMA2 }]) > 0);
        });

        it("should return null for VLI_UNKNOWN", () => {
            assert.strictEqual(null, xz.rawEncoderMemusage([{ id: xz.VLI_UNKNOWN }]));
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(xz.rawEncoderMemusage([{ id: xz.FILTER_LZMA2, preset: i + 1 }]) >=
                    xz.rawEncoderMemusage([{ id: xz.FILTER_LZMA2, preset: i }]));
            }
        });

        it("should fail if input is not an array of filter objects", () => {
            assert.throws(() => {
                xz.rawEncoderMemusage(null);
            });
            assert.throws(() => {
                xz.rawEncoderMemusage([null]);
            });
        });
    });

    describe("#rawDecoderMemusage", () => {
        it("should be positive for LZMA1, LZMA2", () => {
            assert.isOk(xz.rawDecoderMemusage([{ id: xz.FILTER_LZMA1 }]) > 0);
            assert.isOk(xz.rawDecoderMemusage([{ id: xz.FILTER_LZMA2 }]) > 0);
        });

        it("should return null for VLI_UNKNOWN", () => {
            assert.strictEqual(null, xz.rawDecoderMemusage([{ id: xz.VLI_UNKNOWN }]));
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(xz.rawDecoderMemusage([{ id: xz.FILTER_LZMA2, preset: i + 1 }]) >=
                    xz.rawDecoderMemusage([{ id: xz.FILTER_LZMA2, preset: i }]));
            }
        });

        it("should fail if input is not an array of filter objects", () => {
            assert.throws(() => {
                xz.rawDecoderMemusage(null);
            });
            assert.throws(() => {
                xz.rawDecoderMemusage([null]);
            });
        });
    });

    describe("#easyEncoderMemusage", () => {
        it("should be positive", () => {
            assert.isOk(xz.easyEncoderMemusage(1) > 0);
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(xz.easyEncoderMemusage(i + 1) >= xz.easyEncoderMemusage(i));
            }
        });
    });

    describe("#easyDecoderMemusage", () => {
        it("should be positive", () => {
            assert.isOk(xz.easyDecoderMemusage(1) > 0);
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(xz.easyDecoderMemusage(i + 1) >= xz.easyDecoderMemusage(i));
            }
        });
    });
});
