const {
    data: { bson: BSON }
} = adone;

const fs = require("fs");
const { Binary } = BSON;
const { assertBuffersEqual } = require("./tools/utils");

export const fixture = (...args) => adone.path.join(__dirname, ...args);

describe("BSON - Node only", () => {
    it("Should Correctly Serialize and Deserialize a big Binary object", (done) => {
        const data = fs.readFileSync(fixture("data/test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serialized_data = BSON.serialize(doc);

        const serialized_data2 = Buffer.alloc(BSON.calculateObjectSize(doc));
        BSON.serializeWithBufferAndIndex(doc, serialized_data2);
        assertBuffersEqual(done, serialized_data, serialized_data2, 0);

        const deserialized_data = BSON.deserialize(serialized_data);
        expect(doc.doc.value()).to.deep.equal(deserialized_data.doc.value());
        done();
    });
});

describe("Full BSON - Node only", () => {
    it("Should Correctly Serialize and Deserialize a big Binary object", (done) => {
        const data = fs.readFileSync(fixture("data/test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serialized_data = BSON.serialize(doc);
        const deserialized_data = BSON.deserialize(serialized_data);
        expect(doc.doc.value()).to.equal(deserialized_data.doc.value());
        done();
    });

    it("Should Correctly Deserialize bson file from mongodump", (done) => {
        let data = fs.readFileSync(fixture("data/test.bson"), { encoding: null });
        data = Buffer.from(data);
        const docs = [];
        let bsonIndex = 0;
        while (bsonIndex < data.length) {
            bsonIndex = BSON.deserializeStream(data, bsonIndex, 1, docs, docs.length, { isArray: true });
        }

        expect(docs.length).to.equal(1);
        done();
    });
});
