const {
    data: { bson },
    std: { fs }
} = adone;

const { Binary } = bson;
const assertBuffersEqual = require("./tools/utils").assertBuffersEqual;

const fixture = (name) => adone.path.join(__dirname, "data", name);

describe("BSON - Node only", () => {
    it("Should Correctly Serialize and Deserialize a big Binary object", (done) => {
        const data = fs.readFileSync(fixture("test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serializedData = bson.encode(doc);

        const serializedData2 = Buffer.alloc(bson.calculateObjectSize(doc));
        bson.encodeWithBufferAndIndex(doc, serializedData2);
        assertBuffersEqual(done, serializedData, serializedData2, 0);

        const deserializedData = bson.decode(serializedData);
        expect(doc.doc.value()).to.deep.equal(deserializedData.doc.value());
        done();
    });
});

describe("Full BSON - Node only", () => {
    it("Should Correctly Serialize and Deserialize a big Binary object", (done) => {
        const data = fs.readFileSync(fixture("test_gs_weird_bug.png"), "binary");
        const bin = new Binary();
        bin.write(data);
        const doc = { doc: bin };
        const serializedData = bson.encode(doc);
        const deserializedData = bson.decode(serializedData);
        expect(doc.doc.value()).to.equal(deserializedData.doc.value());
        done();
    });

    it("Should Correctly Deserialize bson file from mongodump", (done) => {
        let data = fs.readFileSync(fixture("test.bson"), { encoding: null });
        data = Buffer.from(data);
        const docs = [];
        let bsonIndex = 0;
        while (bsonIndex < data.length) {
            bsonIndex = bson.decodeStream(data, bsonIndex, 1, docs, docs.length, { isArray: true });
        }

        expect(docs.length).to.equal(1);
        done();
    });
});
