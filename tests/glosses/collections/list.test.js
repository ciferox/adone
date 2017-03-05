const { List } = adone.collection;
const describeDeque = require("./deque");
const describeCollection = require("./collection");
const describeToJson = require("./to_json");

describe("List", function () {
    // new List()
    // List()
    // List(values)
    // List(values, equals)
    // List(values, null, content)
    // List(values).find(value)
    // List(values, equals).find(value)
    // List(values, equals).find(value, equals)
    // List(values).findLast(value)
    // List(values, equals).findLast(value)
    // List(values, equals).findLast(value, equals)
    // List(values).has(value)
    // List(values).has(value, equals)
    // List(values).get(value)
    // List(values, equals).get(value)
    // List(values, equals).get(value, equals)
    // List(values).delete(value)
    // List(values, equals).delete(value)
    // List(values, equals).delete(value, equals)
    // List(values).cleare()
    // List(values).reverse()
    // List(values).reduce(callback, basis, thisp)
    // List(values).reduceRight(callback, basis, thisp)
    // List(values).equals(list)
    // List(values).equals(array)
    // List([only]).only()
    // List([]).only()
    // List(many).only()
    // List([]).one()
    // List([one]).one()
    // List(many).one()
    // List(values).iterate()
    // List(values) node.delete()
    // List(values) node.addBefore(node)
    // List(values) node.addAfter(node)

    // List(values).{add,remove}RangeChangeListener
    //      add
    //      delete
    //      push
    //      pop
    //      shift
    //      unshift
    //      splice
    //      swap
    // List(values).{add,remove}BeforeRangeChangeListener
    //      add
    //      delete
    //      push
    //      pop
    //      shift
    //      unshift
    //      splice
    //      swap

    // push, pop, shift, unshift, slice, splice with numeric indicies
    describeDeque(List);

    // construction, has, add, get, delete
    describeCollection(List, [1, 2, 3, 4], true);
    describeCollection(List, [{id: 0}, {id: 1}, {id: 2}, {id: 3}], true);

    describe("equals", function () {
        const list = new List();

        it("should be reflexive", function () {
            expect(list.equals(list)).to.be.true;
        });

        it("should be better than nothing", function () {
            expect(list.equals()).to.be.false;
        });

    });

    describe("compare", function () {
        const list = new List();

        it("should be reflexive", function () {
            expect(list.compare(list)).to.be.equal(0);
        });

        it("should be better than nothing", function () {
            expect(list.compare()).to.be.equal(1);
        });

    });

    describe("find", function () {

        it("should find every value in a list", function () {
            const list = new List([1, 2, 3, 4]);
            expect(list.find(1)).to.be.equal(list.head.next);
            expect(list.find(2)).to.be.equal(list.head.next.next);
            expect(list.find(3)).to.be.equal(list.head.next.next.next);
            expect(list.find(4)).to.be.equal(list.head.next.next.next.next);
            expect(list.find(4)).to.be.equal(list.head.prev);
            expect(list.find(3)).to.be.equal(list.head.prev.prev);
            expect(list.find(2)).to.be.equal(list.head.prev.prev.prev);
            expect(list.find(1)).to.be.equal(list.head.prev.prev.prev.prev);
        });

        it("should the first of equivalent values", function () {
            const list = new List([0, 1, 1, 0]);
            expect(list.find(0)).to.be.equal(list.head.next);
            expect(list.find(1)).to.be.equal(list.head.next.next);
        });

        it("should find values before startIndex", function () {
            const list = new List([2, 3, 2, 3]);
            expect(list.find(2, null, 1)).to.be.equal(list.head.next.next.next);
        });

        it("should use startIndex inclusively", function () {
            const list = new List([2, 3, 2, 3]);
            expect(list.find(3, null, 1)).to.be.equal(list.head.next.next);
        });

    });

    describe("findLast", function () {

        it("should find every value in a list", function () {
            const list = new List([1, 2, 3, 4]);
            expect(list.findLast(1)).to.be.equal(list.head.next);
            expect(list.findLast(2)).to.be.equal(list.head.next.next);
            expect(list.findLast(3)).to.be.equal(list.head.next.next.next);
            expect(list.findLast(4)).to.be.equal(list.head.next.next.next.next);
            expect(list.findLast(4)).to.be.equal(list.head.prev);
            expect(list.findLast(3)).to.be.equal(list.head.prev.prev);
            expect(list.findLast(2)).to.be.equal(list.head.prev.prev.prev);
            expect(list.findLast(1)).to.be.equal(list.head.prev.prev.prev.prev);
        });

        it("should prefer later equivalent values", function () {
            const list = new List([0, 1, 1, 0]);
            expect(list.findLast(0)).to.be.equal(list.head.prev);
            expect(list.findLast(1)).to.be.equal(list.head.prev.prev);
        });

        it("should find values before endIndex", function () {
            const list = new List([2, 3, 2, 3]);
            expect(list.findLast(2, null, 1)).to.be.equal(list.head.next);
        });

        it("should use endIndex inclusively", function () {
            const list = new List([2, 3, 2, 3]);
            expect(list.findLast(3, null, 1)).to.be.equal(list.head.next.next);
        });

    });

    // additional constraints on splice with regard to how it behaves when the
    // offset is provided as a node instead of a number
    describe("splice with nodes", function () {

        it("should splice to end with only an offset argument", function () {
            const collection = new List([1, 2, 3, 4]);
            expect(collection.splice(collection.find(3))).to.be.eql([3, 4]);
            expect(collection.toArray()).to.be.eql([1, 2]);
        });

        it("should splice nothing with no length", function () {
            const collection = new List([1, 2, 3, 4]);
            expect(collection.splice(collection.find(3), 0)).to.be.eql([]);
            expect(collection.toArray()).to.be.eql([1, 2, 3, 4]);
        });

        it("should splice one value", function () {
            const collection = new List([1, 2, 3, 4]);
            expect(collection.splice(collection.find(3), 1)).to.be.eql([3]);
            expect(collection.toArray()).to.be.eql([1, 2, 4]);
        });

        it("should splice all values", function () {
            const collection = new List([1, 2, 3, 4]);
            expect(collection.splice(collection.head.next, collection.length)).to.be.eql([1, 2, 3, 4]);
            expect(collection.toArray()).to.be.eql([]);
        });

        it("should splice all values with implied length", function () {
            const collection = new List([1, 2, 3, 4]);
            expect(collection.splice(collection.head.next)).to.be.eql([1, 2, 3, 4]);
            expect(collection.toArray()).to.be.eql([]);
        });

    });

    describe("deleteAll", function () {
        it("deletes all equivalent values", function () {
            const anyEven = {
                equals: function (that) {
                    return that % 2 === 0;
                }
            };
            const collection = new List([1, 2, 3, 4, 5]);
            expect(collection.deleteAll(anyEven)).to.be.equal(2);
            expect(collection.toArray()).to.be.eql([1, 3, 5]);
            expect(collection.length).to.be.equal(3);
        });
    });

    describeToJson(List, [1, 2, 3, 4]);
});
