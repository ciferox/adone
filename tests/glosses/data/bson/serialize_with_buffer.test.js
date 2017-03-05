/* global describe it */


const { BSON } = adone.data.bson;

function createBSON() {
    return new BSON([BSON.Binary, BSON.Code, BSON.DBRef, BSON.Decimal128,
    BSON.Double, BSON.Int32, BSON.Long, BSON.Map, BSON.MaxKey, BSON.MinKey,
    BSON.ObjectId, BSON.BSONRegExp, BSON.Symbol, BSON.Timestamp]);
}


describe("bson", () => {
    describe("serialize with buffer", () => {
        it("correctly serialize into buffer using serializeWithBufferAndIndex", function () {
            const bson = createBSON();
            // Create a buffer
            const b = new Buffer(256);
            // Serialize from index 0
            let r = bson.serializeWithBufferAndIndex({ a: 1 }, b);
            expect(11).to.be.equal(r);

            // Serialize from index r+1
            r = bson.serializeWithBufferAndIndex({ a: 1 }, b, {
                index: r + 1
            });
            expect(23).to.be.equal(r);

            // Deserialize the buffers
            let doc = bson.deserialize(b.slice(0, 12));
            expect({ a: 1 }).to.be.deep.equal(doc);
            doc = bson.deserialize(b.slice(12, 24));
            expect({ a: 1 }).to.be.deep.equal(doc);
        });
    });
});
