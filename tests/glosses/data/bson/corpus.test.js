/* global describe it beforeEach afterEach */

const assert = adone.std.assert;
const { BSON } = adone.data.bson;
const Decimal128 = BSON.Decimal128;
const Long = BSON.Long;
import { deserialize, serialize } from "./extended-json";
const { fs } = adone.std;

function createBSON() {
    return new BSON([BSON.Binary, BSON.Code, BSON.DBRef, BSON.Decimal128,
    BSON.Double, BSON.Int32, BSON.Long, BSON.Map, BSON.MaxKey, BSON.MinKey,
    BSON.ObjectId, BSON.BSONRegExp, BSON.Symbol, BSON.Timestamp]);
}

var bson = createBSON();

describe("bson", () => {
    describe("corpus", () => {
        it("Pass all BSON corpus ./specs/bson-corpus/array.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/array"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/binary.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/binary"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/boolean.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/boolean"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/code_w_scope.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/code_w_scope"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/code.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/code"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/datetime.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/datetime"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/document.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/document"));
        });

        // /**
        //  * @ignore
        //  */
        // exports['Pass all BSON corpus ./specs/bson-corpus/double.json'] = function(test) {
        //   executeAll(require(__dirname + '/specs/bson-corpus/double'));
        // }

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/int32.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/int32"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/int64.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/int64"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/maxkey.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/maxkey"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/minkey.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/minkey"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/null.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/null"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/oid.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/oid"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/regex.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/regex"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/string.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/string"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/symbol.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/symbol"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/timestamp.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/timestamp"));
        });

        /**
         * @ignore
         */
        it("Pass all BSON corpus ./specs/bson-corpus/top.json", function () {
            executeAll(require(__dirname + "/specs/bson-corpus/top"));
        });

        /**
         * @ignore
         */
        it("Pass entire Decimal128 corpus ./specs/decimal128/*", function () {
            executeAll(require(__dirname + "/specs/decimal128/decimal128-1.json"));
            executeAll(require(__dirname + "/specs/decimal128/decimal128-2.json"));
            executeAll(require(__dirname + "/specs/decimal128/decimal128-3.json"));
            executeAll(require(__dirname + "/specs/decimal128/decimal128-4.json"));
            executeAll(require(__dirname + "/specs/decimal128/decimal128-5.json"));
            executeAll(require(__dirname + "/specs/decimal128/decimal128-6.json"));
            executeAll(require(__dirname + "/specs/decimal128/decimal128-7.json"));
        });
    });
});

function executeValid(spec, scenarios) {

    for (let i = 0; i < scenarios.length; i++) {
        let scenario = scenarios[i];

        // Get the scenario bson
        let B = new Buffer(scenario.bson, "hex");
        var E = null;

        // Get the extended json
        if (scenario.extjson) var E = JSON.parse(scenario.extjson);

        // If we have a canonical bson use it instead
        if (scenario.canonical_bson) {
            var cB = new Buffer(scenario.canonical_bson, "hex");
        } else {
            var cB = B;
        }

        // If we have cannonical extended json use it
        if (scenario.canonical_extjson) {
            var cE = JSON.parse(scenario.canonical_extjson);
        } else {
            var cE = E;
        }

        //
        // Baseline tests
        if (cB) {
            assert.deepEqual(cB, bson.serialize(bson.deserialize(B, {
                promoteLongs: false, bsonRegExp: true
            })));
        }

        if (cE) {
            assert.deepEqual(cE, serialize(bson.deserialize(B, {
                promoteLongs: false, bsonRegExp: true
            })));
            assert.deepEqual(cE, serialize(deserialize(E)));
        }

        // if "lossy" not in case:
        if (!scenario.lossy && cB && E) {
            assert.deepEqual(cB, bson.serialize(deserialize(E)));
        }

        //
        // Double check canonical BSON if provided
        try {
            var noMatch = false;
            assert.deepEqual(cB, B);
        } catch (e) {
            var noMatch = true;
        }

        if (noMatch) {
            assert.deepEqual(cB, bson.serialize(bson.deserialize(cB, {
                promoteLongs: false, bsonRegExp: true
            })));
            assert.deepEqual(cE, serialize(bson.deserialize(cB, {
                promoteLongs: false, bsonRegExp: true
            })));
        }

        try {
            var noMatch = false;
            expect(cE).to.be.deep.equal(E);
            assert.deepEqual(cE, E);
        } catch (e) {
            var noMatch = true;
        }
    }
}

function executeDecodeError(spec, scenarios) {
    for (let i = 0; i < scenarios.length; i++) {
        let scenario = scenarios[i];

        // Convert the hex string to a binary buffer
        let buffer = new Buffer(scenario.bson, "hex");
        let failed = false;

        try {
            // Attempt to deserialize the bson
            let deserializedObject = bson.deserialize(buffer, {
                promoteLongs: false, bsonRegExp: true
            });

        } catch (err) {
            failed = true;
        }

        expect(failed).to.be.ok;
    }
}

function executeParseErrors(spec, scenarios) {
    let NAN = new Buffer([0x7c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00].reverse());

    for (let i = 0; i < scenarios.length; i++) {
        let scenario = scenarios[i];

        let threw = false;
        try {
            let value = Decimal128.fromString(scenario.string);
            if (value.toString != scenario.string) threw = true;
        } catch (e) {
            threw = true;
        }

        expect(threw).to.be.true;
    }
}

function executeAll(spec) {
    executeValid(spec, spec.valid || []);
    executeDecodeError(spec, spec.decodeErrors || []);
    executeParseErrors(spec, spec.parseErrors || []);
}