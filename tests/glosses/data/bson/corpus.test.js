import { deserialize, serialize } from "./extended_json";

describe("glosses", "data", "bson", "corpus", () => {
    const { data: { bson: { BSON, Decimal128 } }, std: { assert } } = adone;

    const bson = new BSON();

    const executeValid = (spec, scenarios) => {
        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];

            // Get the scenario bson
            const B = new Buffer(scenario.bson, "hex");
            let E = null;

            // Get the extended json
            if (scenario.extjson) {
                E = JSON.parse(scenario.extjson);
            }

            // If we have a canonical bson use it instead
            let cB;
            if (scenario.canonical_bson) {
                cB = new Buffer(scenario.canonical_bson, "hex");
            } else {
                cB = B;
            }

            // If we have cannonical extended json use it
            let cE;
            if (scenario.canonical_extjson) {
                cE = JSON.parse(scenario.canonical_extjson);
            } else {
                cE = E;
            }

            //
            // Baseline tests
            if (cB) {
                assert.deepEqual(cB, bson.serialize(bson.deserialize(B, {
                    promoteLongs: false,
                    bsonRegExp: true
                })));
            }

            if (cE) {
                assert.deepEqual(cE, serialize(bson.deserialize(B, {
                    promoteLongs: false,
                    bsonRegExp: true
                })));
                assert.deepEqual(cE, serialize(deserialize(E)));
            }

            // if "lossy" not in case:
            if (!scenario.lossy && cB && E) {
                assert.deepEqual(cB, bson.serialize(deserialize(E)));
            }

            //
            // Double check canonical BSON if provided
            let noMatch;
            try {
                noMatch = false;
                assert.deepEqual(cB, B);
            } catch (e) {
                noMatch = true;
            }

            if (noMatch) {
                assert.deepEqual(cB, bson.serialize(bson.deserialize(cB, {
                    promoteLongs: false,
                    bsonRegExp: true
                })));
                assert.deepEqual(cE, serialize(bson.deserialize(cB, {
                    promoteLongs: false,
                    bsonRegExp: true
                })));
            }

            try {
                noMatch = false;
                expect(cE).to.be.deep.equal(E);
                assert.deepEqual(cE, E);
            } catch (e) {
                noMatch = true;
            }
        }
    };

    const executeDecodeError = (spec, scenarios) => {
        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];

            // Convert the hex string to a binary buffer
            const buffer = new Buffer(scenario.bson, "hex");
            let failed = false;

            try {
                // Attempt to deserialize the bson
                bson.deserialize(buffer, {
                    promoteLongs: false,
                    bsonRegExp: true
                });

            } catch (err) {
                failed = true;
            }

            expect(failed).to.be.ok;
        }
    };

    const executeParseErrors = (spec, scenarios) => {
        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];

            let threw = false;
            try {
                const value = Decimal128.fromString(scenario.string);
                if (value.toString !== scenario.string) {
                    threw = true;
                }
            } catch (e) {
                threw = true;
            }

            expect(threw).to.be.true;
        }
    };

    const executeAll = (spec) => {
        executeValid(spec, spec.valid || []);
        executeDecodeError(spec, spec.decodeErrors || []);
        executeParseErrors(spec, spec.parseErrors || []);
    };

    describe("corpus", () => {
        it("Pass all BSON corpus ./specs/bson-corpus/array.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/array`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/binary.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/binary`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/boolean.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/boolean`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/code_w_scope.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/code_w_scope`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/code.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/code`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/datetime.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/datetime`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/document.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/document`));
        });


        it("Pass all BSON corpus ./specs/bson-corpus/int32.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/int32`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/int64.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/int64`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/maxkey.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/maxkey`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/minkey.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/minkey`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/null.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/null`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/oid.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/oid`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/regex.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/regex`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/string.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/string`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/symbol.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/symbol`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/timestamp.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/timestamp`));
        });

        it("Pass all BSON corpus ./specs/bson-corpus/top.json", () => {
            executeAll(require(`${__dirname}/specs/bson-corpus/top`));
        });

        it("Pass entire Decimal128 corpus ./specs/decimal128/*", () => {
            executeAll(require(`${__dirname}/specs/decimal128/decimal128-1.json`));
            executeAll(require(`${__dirname}/specs/decimal128/decimal128-2.json`));
            executeAll(require(`${__dirname}/specs/decimal128/decimal128-3.json`));
            executeAll(require(`${__dirname}/specs/decimal128/decimal128-4.json`));
            executeAll(require(`${__dirname}/specs/decimal128/decimal128-5.json`));
            executeAll(require(`${__dirname}/specs/decimal128/decimal128-6.json`));
            executeAll(require(`${__dirname}/specs/decimal128/decimal128-7.json`));
        });
    });
});
