const {
    crypto: { formatEcdsa }
} = adone;

const CLASS_UNIVERSAL = 0;
const PRIMITIVE_BIT = 0x20;
const TAG_SEQ = (0x10 | PRIMITIVE_BIT) | (CLASS_UNIVERSAL << 6);
const TAG_INT = 0x02 | (CLASS_UNIVERSAL << 6);

describe("crypto", "formatEcdsa", () => {
    describe("derToJose", () => {
        ["ES256", "ES384", "ES512"].forEach((alg) => {
            describe(alg, () => {
                describe("should throw for", () => {
                    it("no signature", () => {
                        const fn = () => formatEcdsa.derToJose();

                        expect(fn).to.throw(TypeError);
                    });

                    it("non buffer or base64 signature", () => {
                        const fn = () => formatEcdsa.derToJose(123);

                        expect(fn).to.throw(TypeError);
                    });

                    it("unknown algorithm", () => {
                        const fn = () => formatEcdsa.derToJose("Zm9vLmJhci5iYXo=", "foozleberries");

                        expect(fn).to.throw(/"foozleberries"/);
                    });

                    it("no seq", () => {
                        const input = Buffer.alloc(10);
                        input[0] = TAG_SEQ + 1; // not seq

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /expected "seq"/);
                    });

                    it("seq length exceeding input", () => {
                        const input = Buffer.alloc(10);
                        input[0] = TAG_SEQ;
                        input[1] = 10;

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /length/);
                    });

                    it("r is not marked as int", () => {
                        const input = Buffer.alloc(10);
                        input[0] = TAG_SEQ;
                        input[1] = 8;
                        input[2] = TAG_INT + 1; // not int

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /expected "int".+"r"/);
                    });

                    it("r length exceeds available input", () => {
                        const input = Buffer.alloc(10);
                        input[0] = TAG_SEQ;
                        input[1] = 8;
                        input[2] = TAG_INT;
                        input[3] = 5;

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /"r".+length/);
                    });

                    it("r length exceeds sensical param length", () => {
                        const input = Buffer.alloc(formatEcdsa.getParamBytesForAlg(alg) + 2 + 6);
                        input[0] = TAG_SEQ;
                        input[1] = formatEcdsa.getParamBytesForAlg(alg) + 2 + 4;
                        input[2] = TAG_INT;
                        input[3] = formatEcdsa.getParamBytesForAlg(alg) + 2;

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /"r".+length.+acceptable/);
                    });

                    it("s is not marked as int", () => {
                        const input = Buffer.alloc(10);
                        input[0] = TAG_SEQ;
                        input[1] = 8;
                        input[2] = TAG_INT;
                        input[3] = 2;
                        input[4] = 0;
                        input[5] = 0;
                        input[6] = TAG_INT + 1; // not int

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /expected "int".+"s"/);
                    });

                    it("s length exceeds available input", () => {
                        const input = Buffer.alloc(10);
                        input[0] = TAG_SEQ;
                        input[1] = 8;
                        input[2] = TAG_INT;
                        input[3] = 2;
                        input[4] = 0;
                        input[5] = 0;
                        input[6] = TAG_INT;
                        input[7] = 3;

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /"s".+length/);
                    });

                    it("s length does not consume available input", () => {
                        const input = Buffer.alloc(10);
                        input[0] = TAG_SEQ;
                        input[1] = 8;
                        input[2] = TAG_INT;
                        input[3] = 2;
                        input[4] = 0;
                        input[5] = 0;
                        input[6] = TAG_INT;
                        input[7] = 1;

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /"s".+length/);
                    });

                    it("s length exceeds sensical param length", () => {
                        const input = Buffer.alloc(formatEcdsa.getParamBytesForAlg(alg) + 2 + 8);
                        input[0] = TAG_SEQ;
                        input[1] = formatEcdsa.getParamBytesForAlg(alg) + 2 + 6;
                        input[2] = TAG_INT;
                        input[3] = 2;
                        input[4] = 0;
                        input[5] = 0;
                        input[6] = TAG_INT;
                        input[7] = formatEcdsa.getParamBytesForAlg(alg) + 2;

                        const fn = () => formatEcdsa.derToJose(input, alg);

                        expect(fn).to.throw(Error, /"s".+length.+acceptable/);
                    });
                });
            });
        });
    });

    describe("joseToDer", () => {
        describe("should throw for", () => {
            it("no signature", () => {
                const fn = () => formatEcdsa.joseToDer();

                expect(fn).to.throw(TypeError);
            });

            it("non buffer or base64 signature", () => {
                const fn = () => formatEcdsa.joseToDer(123);

                expect(fn).to.throw(TypeError);
            });

            it("unknown algorithm", () => {
                const fn = () => formatEcdsa.joseToDer("Zm9vLmJhci5iYXo=", "foozleberries");

                expect(fn).to.throw(/"foozleberries"/);
            });

            it("incorrect signature length (ES256)", () => {
                const fn = () => formatEcdsa.joseToDer("Zm9vLmJhci5iYXo", "ES256");

                expect(fn).to.throw(/"64"/);
            });

            it("incorrect signature length (ES384)", () => {
                const fn = () => formatEcdsa.joseToDer("Zm9vLmJhci5iYXo", "ES384");

                expect(fn).to.throw(/"96"/);
            });

            it("incorrect signature length (ES512)", () => {
                const fn = () => formatEcdsa.joseToDer("Zm9vLmJhci5iYXo", "ES512");

                expect(fn).to.throw(/"132"/);
            });
        });
    });
    
    describe("inverse", () => {
        describe("ES256", () => {
            it("should jose -> der -> jose", () => {
                // Made with WebCrypto
                const expected = "yA4WNemRpUreSh9qgMh_ePGqhgn328ghJ_HG7WOBKQV98eFNm3FIvweoiSzHvl49Z6YTdV4Up7NDD7UcZ-52cw";
                const der = formatEcdsa.joseToDer(expected, "ES256");
                const actual = formatEcdsa.derToJose(der, "ES256");
    
                expect(actual).to.equal(expected);
            });
    
            it("should der -> jose -> der", () => {
                // Made with OpenSSL
                const expected = "MEUCIQD0nDQE4uBS6JuklnyACfPQRB/LMEh5Stq6sAfp38k6ewIgHvhX59iuruBiFpVkg3dQKJ3+Wk29lJmXfxp6ciRdj+Q=";
                const jose = formatEcdsa.derToJose(expected, "ES256");
                const actual = formatEcdsa.joseToDer(jose, "ES256");
    
                expect(actual.toString("base64")).to.equal(expected);
            });
        });
    
        describe("ES384", () => {
            it("should jose -> der -> jose", () => {
                // Made with WebCrypto
                const expected = "TsS1fXqgq5S2lpjO-Tz5w6ZAKqNFuQ6PufvXRN2NRY2DEsQ3iUXdEcAzcMXNqVehkZ-NwUxdIvDqwKTGLYQYVhjBxkdnwm1T5VKG2v1BYFeDQ91sgBlVhHFzvFty5wCI";
                const der = formatEcdsa.joseToDer(expected, "ES384");
                const actual = formatEcdsa.derToJose(der, "ES384");
    
                expect(actual).to.equal(expected);
            });
    
            it("should der -> jose -> der", () => {
                // Made with OpenSSL
                const expected = "MGUCMADcY5icKo+sLF0YCh5eVzju55Elt3Dfu4geMMDnUlLNaEO8NiCFzCHeqMx7mW5GMwIxAI6sp8ihHjRJ0sn/WV6mZCxN6/5lEg1QZJ5eiUHYv2kBgmiJ/Yv1pnqqFY3gVDBp/g==";
                const jose = formatEcdsa.derToJose(expected, "ES384");
                const actual = formatEcdsa.joseToDer(jose, "ES384");
    
                expect(actual.toString("base64")).to.equal(expected);
            });
        });
    
        describe("ES512", () => {
            it("should jose -> der -> jose", () => {
                // Made with WebCrypto
                const expected = "AFKapY_5gq60n8NZ_C2iOQFov7sXgcMyDzCrnGsbvE7OlSBKbgj95aZ7GtdSdbw6joK2jjWJio8IgKNB9o11GdMTADfLUsv9oAJvmIApsmsPBAIe1vH8oeHYiDMBEz9OQcwS5eL-r1iO2v7oxzl9zZb1rA5kzBqS93ARCPKbjgcr602r";
                const der = formatEcdsa.joseToDer(expected, "ES512");
                const actual = formatEcdsa.derToJose(der, "ES512");
    
                expect(actual).to.equal(expected);
            });
    
            it("should der -> jose -> der", () => {
                // Made with OpenSSL
                const expected = "MIGHAkFgiYpVsYxx6XiQp2OXscRW/PrbEcoime/FftP+B7x4QVa+M3KZzXlfP66zKqjo7O3nwK2s8GbTftW8H4HwojzimwJCAYQNsozTpCo5nwIkBgelcfIQ0y/U/60TbNH1+rlKpFDCFs6Q1ro7R1tjtXoAUb9aPIOVyXGiSQX/+fcmmWs1rkJU";
                const jose = formatEcdsa.derToJose(expected, "ES512");
                const actual = formatEcdsa.joseToDer(jose, "ES512");
    
                expect(actual.toString("base64")).to.equal(expected);
            });
        });
    });
    
});
