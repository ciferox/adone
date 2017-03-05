// Array, List, Set, FastSet, unbounded LruSet.
// SortedSet does not qualify since these objects are incomparable.
// Array#get() behaves like a Map, not a Set, so it is excluded from those
// tests.

module.exports = describeCollection;
function describeCollection(Collection, values, setLike) {

    const a = values[0];
    const b = values[1];
    const c = values[2];
    const d = values[3];

    function shouldHaveTheUsualContent(collection) {
        expect(collection.has(a)).to.be.true;
        expect(collection.has(b)).to.be.true;
        expect(collection.has(c)).to.be.true;
        expect(collection.has(d)).to.be.false;
        if (setLike) {
            expect(collection.get(a)).to.be.equal(a);
            expect(collection.get(b)).to.be.equal(b);
            expect(collection.get(c)).to.be.equal(c);
            expect(collection.get(d)).to.be.undefined;
        }
        expect(collection.length).to.be.equal(3);
    }

    it("should be constructable from an array", function () {
        let collection;
        if (adone.is.function(Collection.fromValues)) collection = Collection.fromValues([a, b, c]);
        else collection = Collection.from([a, b, c]);
        shouldHaveTheUsualContent(collection);
    });

    it("should be constructable from an foreachable", function () {
        let collection;
        if (adone.is.function(Collection.fromValues)) {
            collection = Collection.fromValues({
                forEach: function (callback, thisp) {
                    callback.call(thisp, a);
                    callback.call(thisp, b);
                    callback.call(thisp, c);
                }
            });
        } else {
            collection = Collection.from({
                forEach: function (callback, thisp) {
                    callback.call(thisp, a);
                    callback.call(thisp, b);
                    callback.call(thisp, c);
                }
            });
        }
        shouldHaveTheUsualContent(collection);
    });

    describe("add", function () {
        it("should add values to a collection", function () {
            const collection = new Collection();
            // expect(collection.add(a)).to.be.true;
            // expect(collection.add(b)).to.be.true;
            // expect(collection.add(c)).to.be.true;
            collection.add(a);
            collection.add(b);
            collection.add(c);
            shouldHaveTheUsualContent(collection);
        });
    });

    describe("delete", function () {

        it("should remove a value from the beginning of a collection", function () {
            const collection = Collection.from([d, a, b, c]);
            expect(collection.delete(d)).to.be.true;
            shouldHaveTheUsualContent(collection);
        });

        it("should remove a value from the middle of a collection", function () {
            const collection = Collection.from([a, d, b, c]);
            expect(collection.delete(d)).to.be.true;
            shouldHaveTheUsualContent(collection);
        });

        it("should remove a value from the end of a collection", function () {
            const collection = Collection.from([a, b, c, d]);
            expect(collection.delete(d)).to.be.true;
            shouldHaveTheUsualContent(collection);
        });

        it("should fail to remove a value not in a collection", function () {
            const collection = Collection.from([a, b, c]);
            expect(collection.delete(d)).to.be.false;
            shouldHaveTheUsualContent(collection);
        });

    });

    describe("one", function () {
        it("should return a value in the collection", function () {
            const collection = Collection.from([a, b, c, d]);
            expect(collection.has(collection.one())).to.be.true;
        });

        it("should throw an errorf for an empty collection", function () {
            const collection = new Collection();
            expect(collection.one()).to.be.undefined;
        });
    });

    describe("only", function () {

        it("should return a value in the collection", function () {
            const collection = Collection.from([a]);
            expect(collection.only()).to.be.equal(a);
        });

        it("should be undefined if there are no values in the collection", function () {
            expect(new Collection().only()).to.be.undefined;
        });

        it("should be undefined if there are many values in the collection", function () {
            expect(Collection.from([a, b]).only()).to.be.undefined;
        });

    });

    describe("clear", function () {
        it("should delete all values", function () {
            const collection = Collection.from([a, b, c, d]);
            expect(collection.length).to.be.equal(4);
            collection.clear();
            expect(collection.toArray()).to.eql([]);
            expect(collection.length).to.be.equal(0);
        });
    });

}
