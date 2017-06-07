const { compressor: { lzma } } = adone;

describe("compressor", "lzma", () => {
    describe("#versionNumber", () => {
        it("should be present and of number type", () => {
            assert.isOk(lzma.versionNumber());
            assert.equal(typeof lzma.versionNumber(), "number");
        });
    });

    describe("#versionString", () => {
        it("should be present and of string type", () => {
            assert.isOk(lzma.versionNumber());
            assert.equal(typeof lzma.versionString(), "string");
        });
    });

    describe("#checkIsSupported", () => {
        it("should at least support no check and crc32", () => {
            assert.strictEqual(true, lzma.checkIsSupported(lzma.CHECK_NONE));
            assert.strictEqual(true, lzma.checkIsSupported(lzma.CHECK_CRC32));
        });
        it("should return false for non-existing checks", () => {
            // -1 would be thee bitwise or of all possible checks
            assert.strictEqual(false, lzma.checkIsSupported(-1));
        });
    });

    describe("#checkSize", () => {
        it("should be zero for CHECK_NONE", () => {
            assert.strictEqual(0, lzma.checkSize(lzma.CHECK_NONE));
        });

        it("should be non-zero for crc32", () => {
            assert.isOk(lzma.checkSize(lzma.CHECK_CRC32) > 0);
        });

        it("should be monotonous", () => {
            assert.isOk(lzma.checkSize(lzma.CHECK_CRC32 | lzma.CHECK_SHA256) >= lzma.checkSize(lzma.CHECK_CRC32));
        });

        it("should be strictly monotonous if SHA256 is supported", () => {
            assert.isOk(lzma.checkSize(lzma.CHECK_CRC32 | lzma.CHECK_SHA256) > lzma.checkSize(lzma.CHECK_CRC32) ||
                !lzma.checkIsSupported(lzma.CHECK_SHA256));
        });
    });

    describe("#filterEncoderIsSupported", () => {
        it("should return true for LZMA1, LZMA2", () => {
            assert.strictEqual(true, lzma.filterEncoderIsSupported(lzma.FILTER_LZMA1));
            assert.strictEqual(true, lzma.filterEncoderIsSupported(lzma.FILTER_LZMA2));
        });

        it("should return false for VLI_UNKNOWN", () => {
            assert.strictEqual(false, lzma.filterEncoderIsSupported(lzma.VLI_UNKNOWN));
        });

        it("should throw for objects which are not convertible to string", () => {
            const badObject = {
                toString() {
                    throw Error("badObject.toString()");
                }
            };
            assert.throws(() => {
                lzma.filterEncoderIsSupported(badObject);
            });
        });
    });

    describe("#filterDecoderIsSupported", () => {
        it("should return true for LZMA1, LZMA2", () => {
            assert.strictEqual(true, lzma.filterDecoderIsSupported(lzma.FILTER_LZMA1));
            assert.strictEqual(true, lzma.filterDecoderIsSupported(lzma.FILTER_LZMA2));
        });

        it("should return false for VLI_UNKNOWN", () => {
            assert.strictEqual(false, lzma.filterDecoderIsSupported(lzma.VLI_UNKNOWN));
        });
    });

    describe("#mfIsSupported", () => {
        it("should return true for MF_HC4", () => {
            assert.strictEqual(true, lzma.mfIsSupported(lzma.MF_HC4));
        });

        it("should return true for a wrong value", () => {
            assert.strictEqual(false, lzma.mfIsSupported(-1));
        });
    });

    describe("#modeIsSupported", () => {
        it("should return true for LZMA_MODE_FAST", () => {
            assert.strictEqual(true, lzma.modeIsSupported(lzma.MODE_FAST));
        });

        it("should return true for a wrong value", () => {
            assert.strictEqual(false, lzma.modeIsSupported(-1));
        });
    });

    describe("#lzmaFilterEncoderIsSupported", () => {
        it("should return true for and only for encoding-related filters", () => {
            assert.strictEqual(false, lzma.filterEncoderIsSupported());
            assert.strictEqual(false, lzma.filterEncoderIsSupported(null));
            assert.strictEqual(false, lzma.filterEncoderIsSupported(""));
            assert.strictEqual(false, lzma.filterEncoderIsSupported(lzma.LZMA_VLI_UNKNOWN));
            assert.strictEqual(true, lzma.filterEncoderIsSupported(lzma.FILTER_LZMA1));
            assert.strictEqual(true, lzma.filterEncoderIsSupported(lzma.FILTER_LZMA2));
            assert.strictEqual(true, lzma.filterEncoderIsSupported(lzma.FILTERS_MAX));
            assert.strictEqual(false, lzma.filterEncoderIsSupported(lzma.FILTERS_MAX + 1));

            assert.strictEqual("boolean", typeof lzma.filterEncoderIsSupported(lzma.FILTER_POWERPC));
            assert.strictEqual("boolean", typeof lzma.filterEncoderIsSupported(lzma.FILTER_IA64));
            assert.strictEqual("boolean", typeof lzma.filterEncoderIsSupported(lzma.FILTER_ARM));
            assert.strictEqual("boolean", typeof lzma.filterEncoderIsSupported(lzma.FILTER_ARMTHUMB));
            assert.strictEqual("boolean", typeof lzma.filterEncoderIsSupported(lzma.FILTER_SPARC));
            assert.strictEqual("boolean", typeof lzma.filterEncoderIsSupported(lzma.FILTER_DELTA));
        });
    });

    describe("#filterDecoderIsSupported", () => {
        it("should return true for and only for encoding-related filters", () => {
            assert.strictEqual(false, lzma.filterDecoderIsSupported());
            assert.strictEqual(false, lzma.filterDecoderIsSupported(null));
            assert.strictEqual(false, lzma.filterDecoderIsSupported(""));
            assert.strictEqual(false, lzma.filterDecoderIsSupported(lzma.LZMA_VLI_UNKNOWN));
            assert.strictEqual(true, lzma.filterDecoderIsSupported(lzma.FILTER_LZMA1));
            assert.strictEqual(true, lzma.filterDecoderIsSupported(lzma.FILTER_LZMA2));
            assert.strictEqual(true, lzma.filterDecoderIsSupported(lzma.FILTERS_MAX));
            assert.strictEqual(false, lzma.filterDecoderIsSupported(lzma.FILTERS_MAX + 1));

            assert.strictEqual("boolean", typeof lzma.filterDecoderIsSupported(lzma.FILTER_POWERPC));
            assert.strictEqual("boolean", typeof lzma.filterDecoderIsSupported(lzma.FILTER_IA64));
            assert.strictEqual("boolean", typeof lzma.filterDecoderIsSupported(lzma.FILTER_ARM));
            assert.strictEqual("boolean", typeof lzma.filterDecoderIsSupported(lzma.FILTER_ARMTHUMB));
            assert.strictEqual("boolean", typeof lzma.filterDecoderIsSupported(lzma.FILTER_SPARC));
            assert.strictEqual("boolean", typeof lzma.filterDecoderIsSupported(lzma.FILTER_DELTA));
        });
    });

    describe("#rawEncoderMemusage", () => {
        it("should be positive for LZMA1, LZMA2", () => {
            assert.isOk(lzma.rawEncoderMemusage([{ id: lzma.FILTER_LZMA1 }]) > 0);
            assert.isOk(lzma.rawEncoderMemusage([{ id: lzma.FILTER_LZMA2 }]) > 0);
        });

        it("should return null for VLI_UNKNOWN", () => {
            assert.strictEqual(null, lzma.rawEncoderMemusage([{ id: lzma.VLI_UNKNOWN }]));
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(lzma.rawEncoderMemusage([{ id: lzma.FILTER_LZMA2, preset: i + 1 }]) >=
                    lzma.rawEncoderMemusage([{ id: lzma.FILTER_LZMA2, preset: i }]));
            }
        });

        it("should fail if input is not an array of filter objects", () => {
            assert.throws(() => {
                lzma.rawEncoderMemusage(null);
            });
            assert.throws(() => {
                lzma.rawEncoderMemusage([null]);
            });
        });
    });

    describe("#rawDecoderMemusage", () => {
        it("should be positive for LZMA1, LZMA2", () => {
            assert.isOk(lzma.rawDecoderMemusage([{ id: lzma.FILTER_LZMA1 }]) > 0);
            assert.isOk(lzma.rawDecoderMemusage([{ id: lzma.FILTER_LZMA2 }]) > 0);
        });

        it("should return null for VLI_UNKNOWN", () => {
            assert.strictEqual(null, lzma.rawDecoderMemusage([{ id: lzma.VLI_UNKNOWN }]));
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(lzma.rawDecoderMemusage([{ id: lzma.FILTER_LZMA2, preset: i + 1 }]) >=
                    lzma.rawDecoderMemusage([{ id: lzma.FILTER_LZMA2, preset: i }]));
            }
        });

        it("should fail if input is not an array of filter objects", () => {
            assert.throws(() => {
                lzma.rawDecoderMemusage(null);
            });
            assert.throws(() => {
                lzma.rawDecoderMemusage([null]);
            });
        });
    });

    describe("#easyEncoderMemusage", () => {
        it("should be positive", () => {
            assert.isOk(lzma.easyEncoderMemusage(1) > 0);
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(lzma.easyEncoderMemusage(i + 1) >= lzma.easyEncoderMemusage(i));
            }
        });
    });

    describe("#easyDecoderMemusage", () => {
        it("should be positive", () => {
            assert.isOk(lzma.easyDecoderMemusage(1) > 0);
        });

        it("should be monotonous in the preset parameter", () => {
            for (let i = 1; i < 9; ++i) {
                assert.isOk(lzma.easyDecoderMemusage(i + 1) >= lzma.easyDecoderMemusage(i));
            }
        });
    });

});
