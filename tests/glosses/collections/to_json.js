module.exports = describeToJson;
function describeToJson(Collection, values) {
    describe("toJSON", function () {
        it("stringifies and parses to a collection with the same data", function () {
            const collection = new Collection(values);
            const stringified = JSON.stringify(collection);

            const newCollection = new Collection(JSON.parse(stringified));

            expect(stringified).to.eql(JSON.stringify(values));

            if (collection.entriesArray) {
                expect(Object.equals(collection.entriesArray(), newCollection.entriesArray())).to.eql(true);
            } else {
                expect(Object.equals(collection.toArray(), newCollection.toArray())).to.eql(true);
            }
        });
    });
}
