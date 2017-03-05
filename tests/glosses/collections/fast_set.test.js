const { Iterator, FastSet } = adone.collection;

const describeCollection = require("./collection");
const describeSet = require("./set");
const describeToJson = require("./to_json");

describe("FastSet", function () {
    // new FastSet()
    // FastSet()
    // FastSet(values)
    // FastSet(null, equals, hash)
    // FastSet(null, null, null, content)
    // FastSet().has(value)
    // FastSet().get(value)
    // FastSet().delete(value)
    // FastSet().clear()
    // FastSet().add(value)
    // FastSet().reduce(callback, basis, thisp)
    // FastSet().forEach()
    // FastSet().map()
    // FastSet().toArray()
    // FastSet().filter()
    // FastSet().every()
    // FastSet().some()
    // FastSet().all()
    // FastSet().any()
    // FastSet().min()
    // FastSet().max()

    describeCollection(FastSet, [1, 2, 3, 4], true);
    describeCollection(FastSet, [{id: 0}, {id: 1}, {id: 2}, {id: 3}], true);
    describeSet(FastSet);
    describeToJson(FastSet, [1, 2, 3, 4]);

    it("can use hash delegate methods", function () {
        function Item(key, value) {
            this.key = key;
            this.value = value;
        }

        Item.prototype.hash = function () {
            return "" + this.key;
        };

        const set = new FastSet();
        set.add(new Item(1, "a"));
        set.add(new Item(3, "b"));
        set.add(new Item(2, "c"));
        set.add(new Item(2, "d"));

        expect(set.buckets.keysArray().sort()).to.be.eql(["1", "2", "3"]);

    });

    it("can iterate with forEach", function () {
        const values = [false, null, undefined, 0, 1, {}];
        const set = new FastSet(values);
        set.forEach(function (value) {
            const index = values.indexOf(value);
            values.splice(index, 1);
        });
        expect(values.length).to.be.equal(0);
    });

    it("can iterate with an iterator", function () {
        const set = new FastSet([1, 2, 3, 4, 5, 6]);
        const iterator = new Iterator(set);
        const array = iterator.toArray();
        expect(array).to.be.eql(set.toArray());
    });
});
