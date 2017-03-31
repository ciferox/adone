const { bson } = adone.data;
const { BSON } = bson;
const Code = bson.Code;
const Binary = bson.Binary;
const Timestamp = bson.Timestamp;
const Long = bson.Long;
const MongoReply = bson.MongoReply;
const ObjectID = bson.ObjectID;
const Symbol = bson.Symbol;
const DBRef = bson.DBRef;
const Int32 = bson.Int32;
const BSONRegExp = bson.BSONRegExp;
const Decimal128 = bson.Decimal128;
const Double = bson.Double;
const MinKey = bson.MinKey;
const MaxKey = bson.MaxKey;
const { fs } = adone.std;

function createBSON() {
    return new BSON();
}

describe("bson", () => {
    describe("compliance", () => {
        it("should pass all corrupt BSON scenarios ./compliance/corrupt.json", () => {
            // Read and parse the json file
            let scenarios = require(__dirname + "/compliance/corrupt");

            // Create a new BSON instance
            let bson = createBSON();

            for (let i = 0; i < scenarios.documents.length; i++) {
                let doc = scenarios.documents[i];
                if (doc.skip) continue;

                let err;
                try {
                    // Create a buffer containing the payload
                    let buffer = new Buffer(doc.encoded, "hex");
                    // Attempt to deserialize
                    bson.deserialize(buffer);
                } catch (_err) {
                    err = _err;
                }
                expect(err).to.be.ok;
            }
        });

        it("should pass all valid BSON serialization scenarios ./compliance/valid.json", () => {
            // Read and parse the json file
            let scenarios = require(__dirname + "/compliance/valid");

            // Create a new BSON instance
            let bson = createBSON();

            // Translate extended json to correctly typed doc
            let translate = function (doc, object) {
                for (let name in doc) {
                    if (typeof doc[name] == "number"
                        || typeof doc[name] == "string"
                        || typeof doc[name] == "boolean") {
                        object[name] = doc[name];
                    } else if (Array.isArray(doc[name])) {
                        object[name] = translate(doc[name], []);
                    } else if (doc[name]["$numberLong"]) {
                        object[name] = Long.fromString(doc[name]["$numberLong"]);
                    } else if (doc[name]["$undefined"]) {
                        object[name] = null;
                    } else if (doc[name]["$date"]) {
                        let date = new Date();
                        date.setTime(parseInt(doc[name]["$date"]["$numberLong"], 10));
                        object[name] = date;
                    } else if (doc[name]["$regexp"]) {
                        object[name] = new RegExp(doc[name]["$regexp"], doc[name]["$options"] || "");
                    } else if (doc[name]["$oid"]) {
                        object[name] = new ObjectID(doc[name]["$oid"]);
                    } else if (doc[name]["$binary"]) {
                        object[name] = new Binary(doc[name]["$binary"], doc[name]["$type"] || 1);
                    } else if (doc[name]["$timestamp"]) {
                        object[name] = Timestamp.fromBits(parseInt(doc[name]["$timestamp"]["t"], 10), parseInt(doc[name]["$timestamp"]["i"]));
                    } else if (doc[name]["$ref"]) {
                        object[name] = new DBRef(doc[name]["$ref"], doc[name]["$id"]);
                    } else if (doc[name]["$minKey"]) {
                        object[name] = new MinKey();
                    } else if (doc[name]["$maxKey"]) {
                        object[name] = new MaxKey();
                    } else if (doc[name]["$code"]) {
                        object[name] = new Code(doc[name]["$code"], doc[name]["$scope"] || {});
                    } else if (doc[name] != null && typeof doc[name] == "object") {
                        object[name] = translate(doc[name], {});
                    }
                }

                return object;
            };

            // Iterate over all the results
            scenarios.documents.forEach(function (doc) {
                if (doc.skip) return;
                // Create a buffer containing the payload
                let expectedData = new Buffer(doc.encoded, "hex");
                // Get the expectedDocument
                let expectedDocument = translate(doc.document, {});
                // Serialize to buffer
                let buffer = bson.serialize(expectedDocument);
                // Validate the output
                expect(expectedData.toString("hex")).to.be.equal(buffer.toString("hex"));
                // Attempt to deserialize
                let object = bson.deserialize(buffer, { promoteLongs: false });
                // // Validate the object
                expect(JSON.stringify(expectedDocument)).to.be.deep.equal(JSON.stringify(object));
            });
        });
    });
});