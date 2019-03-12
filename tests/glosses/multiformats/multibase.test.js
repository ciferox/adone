const {
    is,
    multiformat: { multibase }
} = adone;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "multiformats", "multibase", ...args);

const constants = require(srcPath("constants.js"));

const unsupportedBases = [
    ["base1"]
];

const supportedBases = [
    ["base2", "yes mani !", "01111001011001010111001100100000011011010110000101101110011010010010000000100001"],
    ["base8", "yes mani !", "7171312714403326055632220041"],
    ["base10", "yes mani !", "9573277761329450583662625"],
    ["base16", "yes mani !", "f796573206d616e692021"],

    ["base16", Buffer.from([0x01]), "f01"],
    ["base16", Buffer.from([15]), "f0f"],
    ["base16", "f", "f66"],
    ["base16", "fo", "f666f"],
    ["base16", "foo", "f666f6f"],
    ["base16", "foob", "f666f6f62"],
    ["base16", "fooba", "f666f6f6261"],
    ["base16", "foobar", "f666f6f626172"],

    ["base32", "yes mani !", "bpfsxgidnmfxgsibb"],
    ["base32", "f", "bmy"],
    ["base32", "fo", "bmzxq"],
    ["base32", "foo", "bmzxw6"],
    ["base32", "foob", "bmzxw6yq"],
    ["base32", "fooba", "bmzxw6ytb"],
    ["base32", "foobar", "bmzxw6ytboi"],

    ["base32pad", "yes mani !", "cpfsxgidnmfxgsibb"],
    ["base32pad", "f", "cmy======"],
    ["base32pad", "fo", "cmzxq===="],
    ["base32pad", "foo", "cmzxw6==="],
    ["base32pad", "foob", "cmzxw6yq="],
    ["base32pad", "fooba", "cmzxw6ytb"],
    ["base32pad", "foobar", "cmzxw6ytboi======"],

    ["base32hex", "yes mani !", "vf5in683dc5n6i811"],
    ["base32hex", "f", "vco"],
    ["base32hex", "fo", "vcpng"],
    ["base32hex", "foo", "vcpnmu"],
    ["base32hex", "foob", "vcpnmuog"],
    ["base32hex", "fooba", "vcpnmuoj1"],
    ["base32hex", "foobar", "vcpnmuoj1e8"],

    ["base32hexpad", "yes mani !", "tf5in683dc5n6i811"],
    ["base32hexpad", "f", "tco======"],
    ["base32hexpad", "fo", "tcpng===="],
    ["base32hexpad", "foo", "tcpnmu==="],
    ["base32hexpad", "foob", "tcpnmuog="],
    ["base32hexpad", "fooba", "tcpnmuoj1"],
    ["base32hexpad", "foobar", "tcpnmuoj1e8======"],

    ["base32z", "yes mani !", "hxf1zgedpcfzg1ebb"],
    ["base58flickr", "yes mani !", "Z7Pznk19XTTzBtx"],
    ["base58btc", "yes mani !", "z7paNL19xttacUY"],

    ["base64", "÷ïÿ", "mw7fDr8O/"],
    ["base64", "f", "mZg"],
    ["base64", "fo", "mZm8"],
    ["base64", "foo", "mZm9v"],
    ["base64", "foob", "mZm9vYg"],
    ["base64", "fooba", "mZm9vYmE"],
    ["base64", "foobar", "mZm9vYmFy"],
    ["base64", "÷ïÿ🥰÷ïÿ😎🥶🤯", "mw7fDr8O/8J+lsMO3w6/Dv/CfmI7wn6W28J+krw"],

    ["base64pad", "f", "MZg=="],
    ["base64pad", "fo", "MZm8="],
    ["base64pad", "foo", "MZm9v"],
    ["base64pad", "foob", "MZm9vYg=="],
    ["base64pad", "fooba", "MZm9vYmE="],
    ["base64pad", "foobar", "MZm9vYmFy"],

    ["base64url", "÷ïÿ", "uw7fDr8O_"],
    ["base64url", "÷ïÿ🥰÷ïÿ😎🥶🤯", "uw7fDr8O_8J-lsMO3w6_Dv_CfmI7wn6W28J-krw"],

    ["base64urlpad", "f", "UZg=="],
    ["base64urlpad", "fo", "UZm8="],
    ["base64urlpad", "foo", "UZm9v"],
    ["base64urlpad", "foob", "UZm9vYg=="],
    ["base64urlpad", "fooba", "UZm9vYmE="],
    ["base64urlpad", "foobar", "UZm9vYmFy"],
    ["base64urlpad", "÷ïÿ🥰÷ïÿ😎🥶🤯", "Uw7fDr8O_8J-lsMO3w6_Dv_CfmI7wn6W28J-krw=="]
];

describe("multiformat", "multobase", () => {
    describe("generic", () => {
        it("fails on no args", () => {
            expect(multibase).to.throw(Error);
        });

        it("fails on no buf", () => {
            expect(() => {
                multibase("base1");
            }).to.throw(Error);
        });

        it("fails on non supported name", () => {
            expect(() => {
                multibase("base1001", Buffer.from("meh"));
            }).to.throw(Error);
        });

        it("fails on non supported code", () => {
            expect(() => {
                multibase("6", Buffer.from("meh"));
            }).to.throw(Error);
        });
    });

    for (const elements of supportedBases) {
        const name = elements[0];
        const input = elements[1];
        const output = elements[2];
        const base = constants.names[name];
        describe(name, () => {
            it("adds multibase code to valid encoded buffer, by name", () => {
                if (is.string(input)) {
                    const buf = Buffer.from(input);
                    const encodedBuf = Buffer.from(base.encode(buf));
                    const multibasedBuf = multibase(base.name, encodedBuf);
                    expect(multibasedBuf.toString()).to.equal(output);
                } else {
                    const encodedBuf = Buffer.from(base.encode(input));
                    const multibasedBuf = multibase(base.name, encodedBuf);
                    expect(multibasedBuf.toString()).to.equal(output);
                }
            });

            it("adds multibase code to valid encoded buffer, by code", () => {
                const buf = Buffer.from(input);
                const encodedBuf = Buffer.from(base.encode(buf));
                const multibasedBuf = multibase(base.code, encodedBuf);
                expect(multibasedBuf.toString()).to.equal(output);
            });

            it("fails to add multibase code to invalid encoded buffer", () => {
                const nonEncodedBuf = Buffer.from("^!@$%!#$%@#y");
                expect(() => {
                    multibase(base.name, nonEncodedBuf);
                }).to.throw(Error);
            });

            it("isEncoded string", () => {
                const name = multibase.isEncoded(output);
                expect(name).to.equal(base.name);
            });

            it("isEncoded buffer", () => {
                const multibasedStr = Buffer.from(output);
                const name = multibase.isEncoded(multibasedStr);
                expect(name).to.equal(base.name);
            });
        });
    }

    describe("encode ", () => {
        for (const elements of supportedBases) {
            const name = elements[0];
            const input = elements[1];
            const output = elements[2];
            describe(name, () => {
                it("encodes a buffer", () => {
                    const buf = Buffer.from(input);
                    const multibasedBuf = multibase.encode(name, buf);
                    expect(multibasedBuf.toString()).to.equal(output);
                });
            });
        }
    });

    describe("decode", () => {
        for (const elements of supportedBases) {
            const name = elements[0];
            const input = elements[1];
            const output = elements[2];
            describe(name, () => {
                it("decodes a string", () => {
                    const multibasedStr = output;
                    const buf = multibase.decode(multibasedStr);
                    expect(buf).to.eql(Buffer.from(input));
                });

                it("decodes a buffer", () => {
                    const multibasedBuf = Buffer.from(output);
                    const buf = multibase.decode(multibasedBuf);
                    expect(buf).to.eql(Buffer.from(input));
                });
            });
        }
    });

    for (const elements of unsupportedBases) {
        const name = elements[0];
        describe(name, () => {
            it("fails on non implemented name", () => {
                expect(() => {
                    multibase(name, Buffer.from("meh"));
                }).to.throw(Error);
            });
        });
    }

    describe("names", () => {
        it("includes all base names", () => {
            Object.keys(constants.names).forEach((name) => {
                expect(multibase.names).to.include(name);
            });
        });

        it("base names are frozen", () => {
            expect(Object.isFrozen(multibase.names)).to.be.true();
        });
    });

    describe("codes", () => {
        it("includes all base codes", () => {
            Object.keys(constants.codes).forEach((code) => {
                expect(multibase.codes).to.include(code);
            });
        });

        it("base codes are frozen", () => {
            expect(Object.isFrozen(multibase.codes)).to.be.true();
        });
    });

    describe("isEncoded", () => {
        it("should not throw for non string/buffer input", () => {
            const invalidInputs = [
                null,
                undefined,
                false,
                0,
                {},
                [],
                /[a-z]/,
                () => { },
                Symbol("test")
            ];

            invalidInputs.forEach((input) => {
                expect(() => multibase.isEncoded(input)).to.not.throw();
                expect(multibase.isEncoded(input)).to.be.false();
            });
        });
    });

    describe("constants", () => {
        it("constants indexed by name", () => {
            const names = constants.names;
            expect(Object.keys(names).length).to.equal(16);
        });

        it("constants indexed by code", () => {
            const codes = constants.codes;
            expect(Object.keys(codes).length).to.equal(16);
        });
    });
});