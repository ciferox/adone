const {
    is,
    multi
} = adone;

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
    ["base32hex", "yes mani !", "vf5in683dc5n6i811"],
    ["base32", "yes mani !", "bpfsxgidnmfxgsibb"],
    ["base32z", "yes mani !", "hxf1zgedpcfzg1ebb"],
    ["base58flickr", "yes mani !", "Z7Pznk19XTTzBtx"],
    ["base58btc", "yes mani !", "z7paNL19xttacUY"],
    ["base64", "÷ïÿ", "mw7fDr8O/"],
    ["base64url", "÷ïÿ", "uw7fDr8O_"]
];

describe("multi", "base", () => {
    describe("generic", () => {
        it("fails on no args", () => {
            expect(multi.base.create).to.throw(Error);
        });

        it("fails on no buf", () => {
            expect(() => {
                multi.base.create("base1");
            }).to.throw(Error);
        });

        it("fails on non supported name", () => {
            expect(() => {
                multi.base.create("base1001", Buffer.from("meh"));
            }).to.throw(Error);
        });

        it("fails on non supported code", () => {
            expect(() => {
                multi.base.create("6", Buffer.from("meh"));
            }).to.throw(Error);
        });
    });

    for (const elements of supportedBases) {
        const name = elements[0];
        const input = elements[1];
        const output = elements[2];
        const base = multi.base.names[name];
        // eslint-disable-next-line
        describe(name, () => {
            it("adds multibase code to valid encoded buffer, by name", () => {
                if (is.string(input)) {
                    const buf = Buffer.from(input);
                    const encodedBuf = Buffer.from(base.encode(buf));
                    const multibasedBuf = multi.base.create(base.name, encodedBuf);
                    expect(multibasedBuf.toString()).to.equal(output);
                } else {
                    const encodedBuf = Buffer.from(base.encode(input));
                    const multibasedBuf = multi.base.create(base.name, encodedBuf);
                    expect(multibasedBuf.toString()).to.equal(output);
                }
            });

            it("adds multibase code to valid encoded buffer, by code", () => {
                const buf = Buffer.from(input);
                const encodedBuf = Buffer.from(base.encode(buf));
                const multibasedBuf = multi.base.create(base.code, encodedBuf);
                expect(multibasedBuf.toString()).to.equal(output);
            });

            it("fails to add multibase code to invalid encoded buffer", () => {
                const nonEncodedBuf = Buffer.from("^!@$%!#$%@#y");
                expect(() => {
                    multi.base.create(base.name, nonEncodedBuf);
                }).to.throw(Error);
            });

            it("isEncoded string", () => {
                const name = multi.base.isEncoded(output);
                expect(name).to.equal(base.name);
            });

            it("isEncoded buffer", () => {
                const multibasedStr = Buffer.from(output);
                const name = multi.base.isEncoded(multibasedStr);
                expect(name).to.equal(base.name);
            });
        });
    }

    describe("encode ", () => {
        for (const elements of supportedBases) {
            const name = elements[0];
            const input = elements[1];
            const output = elements[2];
            // eslint-disable-next-line
            describe(name, () => {
                it("encodes a buffer", () => {
                    const buf = Buffer.from(input);
                    const multibasedBuf = multi.base.encode(name, buf);
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
            // eslint-disable-next-line
            describe(name, () => {
                it("decodes a string", () => {
                    const multibasedStr = output;
                    const buf = multi.base.decode(multibasedStr);
                    expect(buf).to.eql(Buffer.from(input));
                });

                it("decodes a buffer", () => {
                    const multibasedBuf = Buffer.from(output);
                    const buf = multi.base.decode(multibasedBuf);
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
                    multi.base.create(name, Buffer.from("meh"));
                }).to.throw(Error);
            });
        });
    }
});
