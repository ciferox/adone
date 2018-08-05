const {
    data: { bson2 }
} = adone;

const {
    Decimal128
} = bson2;

const deserializeOptions = {
    bsonRegExp: true,
    promoteLongs: true,
    promoteValues: false
};

const serializeOptions = {
    ignoreUndefined: false
};

// tests from the corpus that we need to skip, and explanations why

const skip = {
    "NaN with payload":
        "passing this would require building a custom type to store the NaN payload data."
};

const corpus = require("./tools/bson_corpus_test_loader");

describe("data", "bson", "BSON Corpus", () => {
    corpus.forEach((scenario) => {
        describe(scenario.description, () => {
            if (scenario.valid) {
                describe("valid", () => {
                    scenario.valid.forEach((v) => {
                        if (skip.hasOwnProperty(v.description)) {
                            it.skip(v.description, () => { });
                            return;
                        }

                        it(v.description, () => {
                            const cB = Buffer.from(v.canonical_bson, "hex");
                            let dB;
                            let convB;
                            if (v.degenerate_bson) {
                                dB = Buffer.from(v.degenerate_bson, "hex");
                            }
                            if (v.converted_bson) {
                                convB = Buffer.from(v.converted_bson, "hex");
                            }

                            const roundTripped = bson2.encode(
                                bson2.decode(cB, deserializeOptions),
                                serializeOptions
                            );

                            if (scenario.deprecated) {
                                expect(convB).to.deep.equal(roundTripped);
                            }
                            else {
                                expect(cB).to.deep.equal(roundTripped);
                            }

                            if (dB) {
                                expect(cB).to.deep.equal(
                                    bson2.encode(bson2.decode(dB, deserializeOptions), serializeOptions)
                                );
                            }
                        });
                    });
                });
            }

            if (scenario.decodeErrors) {
                describe("decodeErrors", () => {
                    scenario.decodeErrors.forEach((d) => {
                        it(d.description, () => {
                            const B = new Buffer(d.bson, "hex");
                            expect(() => bson2.decode(B, deserializeOptions)).to.throw();
                        });
                    });
                });
            }

            if (scenario.parseErrors) {
                describe("parseErrors", () => {
                    scenario.parseErrors.forEach((p) => {
                        it(p.description, () => {
                            expect(() => Decimal128.fromString(scenario.string)).to.throw();
                        });
                    });
                });
            }
        });
    });
});
