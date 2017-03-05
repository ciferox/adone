// Describe Array, List, and SortedSet, all of which have the interface of a
// double-ended queue.  Array and List are proper queues since push and unshift
// put the values at the ends, but for sake of reusing these tests for
// SortedSet, all of these tests maintain the sorted order of the collection.

const fuzzDeque = require("./deque_fuzz").fuzzDeque;

module.exports = describeDeque;
function describeDeque(Deque) {

    describe("add(value)", function () {
        it("should be an alias for push", function () {
            const collection = new Deque([1, 2, 3]);
            collection.add(4);
            expect(collection.toArray()).to.eql([1, 2, 3, 4]);
        });
    });

    describe("push(value)", function () {
        it("should add one value to the end", function () {
            const collection = new Deque([1, 2, 3]);
            collection.push(4);
            expect(collection.toArray()).to.eql([1, 2, 3, 4]);
        });
    });

    describe("push(...values)", function () {
        it("should add many values to the end", function () {
            const collection = new Deque([1, 2, 3]);
            collection.push(4, 5, 6);
            expect(collection.toArray()).to.eql([1, 2, 3, 4, 5, 6]);
        });

        it("should add many values to the end variadically", function () {
            const collection = new Deque([1, 2, 3]);
            collection.push.apply(collection, [4, 5, 6]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4, 5, 6]);
        });
    });

    describe("unshift(value)", function () {
        it("should add a value to the beginning", function () {
            const collection = new Deque([1, 2, 3]);
            collection.unshift(0);
            expect(collection.toArray()).to.eql([0, 1, 2, 3]);
        });
    });

    describe("unshift(...values)", function () {
        it("should add many values to the beginning", function () {
            const collection = new Deque([1, 2, 3]);
            collection.unshift(-2, -1, 0);
            expect(collection.toArray()).to.eql([-2, -1, 0, 1, 2, 3]);
        });

        it("should add many values to the beginning", function () {
            const collection = new Deque([1, 2, 3]);
            collection.unshift.apply(collection, [-2, -1, 0]);
            expect(collection.toArray()).to.eql([-2, -1, 0, 1, 2, 3]);
        });
    });

    describe("pop", function () {
        it("should remove one value from the end and return it", function () {
            const collection = new Deque([1, 2, 3]);
            expect(collection.pop()).to.eql(3);
            expect(collection.toArray()).to.eql([1, 2]);
        });
    });

    describe("shift", function () {
        it("should remove one value from the beginning and return it", function () {
            const collection = new Deque([1, 2, 3]);
            expect(collection.shift()).to.eql(1);
            expect(collection.toArray()).to.eql([2, 3]);
        });
    });

    describe("concat", function () {
        it("should concatenate variadic mixed-type collections", function () {
            const collection = new Deque([1, 2, 3]).concat(
                [4, 5, 6],
                new Deque([7, 8, 9])
            );
            expect(collection.toArray()).to.eql([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
    });

    describe("slice", function () {
        if (!Deque.prototype.slice)
            return;

        const collection = new Deque([1, 2, 3, 4]);

        it("should slice all values with no arguments", function () {
            expect(collection.slice()).to.eql([1, 2, 3, 4]);
        });

        it("should slice all after an index", function () {
            expect(collection.slice(2)).to.eql([3, 4]);
        });

        it("should slice from the middle by indexed positions", function () {
            expect(collection.slice(1, 3)).to.eql([2, 3]);
        });

        it("should slice from a negative index", function () {
            expect(collection.slice(-2)).to.eql([3, 4]);
        });

        it("should slice from a negative index to a positive", function () {
            expect(collection.slice(-2, 3)).to.eql([3]);
        });

        it("should slice from a negative index to a negative", function () {
            expect(collection.slice(-2, -1)).to.eql([3]);
        });

        // TODO
        /*
        it("should slice from a negative index to zero", function () {
            expect(collection.slice(-2, 0)).to.eql([]); // Array
            expect(collection.slice(-2, 0)).to.eql([3, 4]); // List
        });
        */

    });

    describe("splice", function () {
        if (!Deque.prototype.splice)
            return;

        it("should do nothing with no arguments", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.splice()).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4]);
        });

        it("should splice to end with only an offset argument", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.splice(2)).to.eql([3, 4]);
            expect(collection.toArray()).to.eql([1, 2]);
        });

        it("should splice nothing with no length", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.splice(2, 0)).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4]);
        });

        it("should splice all values", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.splice(0, collection.length)).to.eql([1, 2, 3, 4]);
            expect(collection.toArray()).to.eql([]);
        });

        it("should splice from negative offset", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.splice(-2)).to.eql([3, 4]);
            expect(collection.toArray()).to.eql([1, 2]);
        });

        it("should inject values at a numeric offset", function () {
            const collection = new Deque([1, 2, 5, 6]);
            expect(collection.splice(2, 0, 3, 4)).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4, 5, 6]);
        });

        it("should replace values at a numeric offset", function () {
            const collection = new Deque([1, 2, 3, 6]);
            expect(collection.splice(1, 2, 4, 5)).to.eql([2, 3]);
            expect(collection.toArray()).to.eql([1, 4, 5, 6]);
        });

        it("should inject values with implied position and length", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.splice(null, null, -1, 0)).to.eql([]);
            expect(collection.toArray()).to.eql([-1, 0, 1, 2, 3, 4]);
        });

        it("should append values", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.splice(4, 0, 5, 6)).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4, 5, 6]);
        });

    });

    describe("swap", function () {
        if (!Deque.prototype.swap)
            return;

        it("should do nothing with no arguments", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.swap()).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4]);
        });

        it("should splice to end with only an offset argument", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.swap(2)).to.eql([3, 4]);
            expect(collection.toArray()).to.eql([1, 2]);
        });

        it("should splice nothing with no length", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.swap(2, 0)).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4]);
        });

        it("should splice all values", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.swap(0, collection.length)).to.eql([1, 2, 3, 4]);
            expect(collection.toArray()).to.eql([]);
        });

        it("should splice from negative offset", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.swap(-2)).to.eql([3, 4]);
            expect(collection.toArray()).to.eql([1, 2]);
        });

        it("should inject values at a numeric offset", function () {
            const collection = new Deque([1, 2, 5, 6]);
            expect(collection.swap(2, 0, [3, 4])).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4, 5, 6]);
        });

        it("should replace values at a numeric offset", function () {
            const collection = new Deque([1, 2, 3, 6]);
            expect(collection.swap(1, 2, [4, 5])).to.eql([2, 3]);
            expect(collection.toArray()).to.eql([1, 4, 5, 6]);
        });

        it("should inject values with implied position and length", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.swap(null, null, [-1, 0])).to.eql([]);
            expect(collection.toArray()).to.eql([-1, 0, 1, 2, 3, 4]);
        });

        it("should append values", function () {
            const collection = new Deque([1, 2, 3, 4]);
            expect(collection.swap(4, 0, [5, 6])).to.eql([]);
            expect(collection.toArray()).to.eql([1, 2, 3, 4, 5, 6]);
        });
    });

    if (!Deque.prototype.isSorted) {
        fuzzDeque(Deque);
    }

    describe("peek and poke", function () {
        if (!Deque.prototype.poke && !Deque.prototype.peek)
            return;
        const deque = new Deque([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(deque.peek()).to.be.eql(1);
        expect(deque.poke(2)).to.be.eql(undefined);
        expect(deque.shift()).to.be.eql(2);
        expect(deque.peek()).to.be.eql(2);
    });

    describe("peekBack and pokeBack", function () {
        if (!Deque.prototype.pokeBack && !Deque.prototype.peekBack)
            return;
        const deque = new Deque([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(deque.peekBack()).to.be.eql(8);
        expect(deque.pokeBack(9)).to.be.eql(undefined);
        expect(deque.pop()).to.be.eql(9);
        expect(deque.peekBack()).to.be.eql(7);
    });

    // TODO peekBack
    // TODO pokeBack

    // from https://github.com/petkaantonov/deque

    describe("peek", function () {
        if (!Deque.prototype.peek)
            return;

        it("returns undefined when empty deque", function () {
            const a = new Deque();
            expect(a.length).to.be.eql(0);
            expect(a.peek()).to.be.eql(undefined);
            expect(a.peek()).to.be.eql(undefined);
            expect(a.length).to.be.eql(0);
        });

        it("returns the item at the front of the deque", function () {
            const a = new Deque();
            a.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

            expect(a.peek()).to.be.eql(1);

            var l = 5;
            while (l--) a.pop();

            expect(a.toArray()).to.eql([1, 2, 3, 4]);

            expect(a.peek()).to.be.eql(1);

            var l = 2;
            while (l--) a.shift();

            expect(a.peek()).to.be.eql(3);

            expect(a.toArray()).to.eql([3, 4]);

            a.unshift(1, 2, 3, 4, 5, 6, 78, 89, 12901, 10121, 0, 12, 1, 2, 3, 4, 5, 6, 78, 89, 12901, 10121, 0, 12);

            expect(a.toArray()).to.eql([1, 2, 3, 4, 5, 6, 78, 89, 12901, 10121, 0, 12, 1, 2, 3, 4, 5, 6, 78, 89, 12901, 10121, 0, 12, 3, 4]);

            expect(a.peek()).to.be.eql(1);

            a.push(1, 3, 4);

            expect(a.peek()).to.be.eql(1);

            a.pop();
            a.shift();

            expect(a.peek()).to.be.eql(2);
            expect(a.toArray()).to.eql([2, 3, 4, 5, 6, 78, 89, 12901, 10121, 0, 12, 1, 2, 3, 4, 5, 6, 78, 89, 12901, 10121, 0, 12, 3, 4, 1, 3]);

        });
    });

    describe("clear", function () {
        it("should clear the deque", function () {
            const a = new Deque([1, 2, 3, 4]);
            a.clear();
            expect(a.length).to.be.eql(0);
        });
    });
}