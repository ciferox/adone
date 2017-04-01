describe("glosses", "data", "bson", "serialize with buffer", () => {
    const { data: { bson: { BSON } } } = adone;

    it("correctly serialize into buffer using serializeWithBufferAndIndex", function () {
        const bson = new BSON();
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
