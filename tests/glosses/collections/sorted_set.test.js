const { SortedSet } = adone.collection;
const describeDeque = require("./deque");
const describeCollection = require("./collection");
const describeSet = require("./set");
const describeToJson = require("./to_json");
const Fuzz = require("./fuzz");

describe("SortedSet", function () {
    // TODO SortedSet compare and equals argument overrides

    // construction, has, add, get, delete
    describeCollection(SortedSet, [1, 2, 3, 4], true);

    // comparable objects
    function Value(value) {
        this.value = value;
    }
    Value.prototype.compare = function (that) {
        return Object.compare(this.value, that.value);
    };
    const a = new Value(1);
    const b = new Value(2);
    const c = new Value(3);
    const d = new Value(4);
    const values = [a, b, c, d];
    describeCollection(SortedSet, values, true);

    // Happens to qualify as a deque, since the tests keep the content in
    // sorted order.  SortedSet has meaningful pop and shift operations, but
    // push and unshift just add the arguments into their proper sorted
    // positions rather than the ends.
    describeDeque(SortedSet);

    describeSet(SortedSet, "sorted");
    describeToJson(SortedSet, [1, 2, 3, 4]);

    describe("splayIndex", function () {
        it("should find the index of every element", function () {
            const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            const rand = Fuzz.makeRandom(0);
            numbers.sort(function () {
                return rand() - .5;
            });
            const set = new SortedSet(numbers);
            numbers.forEach(function (index) {
                set.splayIndex(index);
                expect(set.root.index).to.be.equal(index);
                expect(set.root.value).to.be.equal(index);
            });
        });
    });

    describe("indexOf", function () {
        // fuzz cases
        for (let seed = 0; seed < 20; seed++) {
            (function (seed) {
                const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
                const rand = Fuzz.makeRandom(seed);
                numbers.sort(function () {
                    return rand() - .5;
                });
                it("should discern the position of every value in " + numbers.join(", "), function () {
                    const set = new SortedSet(numbers);
                    numbers.forEach(function (n, i) {
                        expect(set.indexOf(n)).to.be.equal(n);
                    });
                });
            })(seed);
        }
    });

    describe("find methods", function () {
        const set = new SortedSet([22, 23, 1, 34, 19, 5, 26, 12, 27, 30, 21,
            20, 6, 7, 2, 32, 10, 9, 33, 3, 11, 17, 28, 15]);

        describe("find", function () {

            it("should find the node for existing values", function () {
                expect(set.find(1).value).to.be.equal(1);
                expect(set.find(5).value).to.be.equal(5);
                expect(set.find(9).value).to.be.equal(9);
                expect(set.find(30).value).to.be.equal(30);
                expect(set.find(34).value).to.be.equal(34);
            });

            it("should return undefined for non-existent values", function () {
                expect(set.find(4)).to.be.undefined;
                expect(set.find(13)).to.be.undefined;
                expect(set.find(31)).to.be.undefined;
            });

        });

        describe("findGreatest", function () {

            it("should return the highest value in the set", function () {
                expect(set.findGreatest().value).to.be.equal(34);
            });

        });

        describe("findLeast", function () {

            it("should return the lowest value in the set", function () {
                expect(set.findLeast().value).to.be.equal(1);
            });

        });

        describe("findGreatestLessThanOrEqual", function () {

            it("should return values that exist in the set", function () {
                expect(set.findGreatestLessThanOrEqual(5).value).to.be.equal(5);
                expect(set.findGreatestLessThanOrEqual(7).value).to.be.equal(7);
                expect(set.findGreatestLessThanOrEqual(9).value).to.be.equal(9);
            });

            it("should return the next highest value", function () {
                expect(set.findGreatestLessThanOrEqual(14).value).to.be.equal(12);
                expect(set.findGreatestLessThanOrEqual(24).value).to.be.equal(23);
                expect(set.findGreatestLessThanOrEqual(31).value).to.be.equal(30);
                expect(set.findGreatestLessThanOrEqual(4).value).to.be.equal(3);
                expect(set.findGreatestLessThanOrEqual(29).value).to.be.equal(28);
                expect(set.findGreatestLessThanOrEqual(25).value).to.be.equal(23);
            });

            it("should return undefined for values out of range", function () {
                expect(set.findGreatestLessThanOrEqual(0)).to.be.undefined;
            });

        });

        describe("findGreatestLessThan", function () {

            it("should return next highest for values that exist in the set", function () {
                expect(set.findGreatestLessThan(5).value).to.be.equal(3);
                expect(set.findGreatestLessThan(7).value).to.be.equal(6);
                expect(set.findGreatestLessThan(9).value).to.be.equal(7);
                expect(set.findGreatestLessThan(26).value).to.be.equal(23);
            });

            it("should return the next highest value", function () {
                expect(set.findGreatestLessThan(14).value).to.be.equal(12);
                expect(set.findGreatestLessThan(24).value).to.be.equal(23);
                expect(set.findGreatestLessThan(31).value).to.be.equal(30);
                expect(set.findGreatestLessThan(4).value).to.be.equal(3);
                expect(set.findGreatestLessThan(29).value).to.be.equal(28);
                expect(set.findGreatestLessThan(25).value).to.be.equal(23);
            });


            it("should return undefined for value at bottom of range", function () {
                expect(set.findGreatestLessThan(1)).to.be.undefined;
            });

        });

        describe("findLeastGreaterThanOrEqual", function () {

            it("should return values that exist in the set", function () {
                expect(set.findLeastGreaterThanOrEqual(5).value).to.be.equal(5);
                expect(set.findLeastGreaterThanOrEqual(7).value).to.be.equal(7);
                expect(set.findLeastGreaterThanOrEqual(9).value).to.be.equal(9);
            });

            it("should return the next value", function () {
                expect(set.findLeastGreaterThanOrEqual(13).value).to.be.equal(15);
                expect(set.findLeastGreaterThanOrEqual(24).value).to.be.equal(26);
                expect(set.findLeastGreaterThanOrEqual(31).value).to.be.equal(32);
                expect(set.findLeastGreaterThanOrEqual(4).value).to.be.equal(5);
                expect(set.findLeastGreaterThanOrEqual(29).value).to.be.equal(30);
                expect(set.findLeastGreaterThanOrEqual(25).value).to.be.equal(26);
            });

            it("should return undefined for values out of range", function () {
                expect(set.findLeastGreaterThanOrEqual(36)).to.be.undefined;
            });

        });

        describe("findLeastGreaterThan", function () {

            it("should return next value for values that exist in the set", function () {
                expect(set.findLeastGreaterThan(5).value).to.be.equal(6);
                expect(set.findLeastGreaterThan(7).value).to.be.equal(9);
                expect(set.findLeastGreaterThan(9).value).to.be.equal(10);
                expect(set.findLeastGreaterThan(26).value).to.be.equal(27);
            });

            it("should return the next value", function () {
                expect(set.findLeastGreaterThan(14).value).to.be.equal(15);
                expect(set.findLeastGreaterThan(24).value).to.be.equal(26);
                expect(set.findLeastGreaterThan(31).value).to.be.equal(32);
                expect(set.findLeastGreaterThan(4).value).to.be.equal(5);
                expect(set.findLeastGreaterThan(29).value).to.be.equal(30);
                expect(set.findLeastGreaterThan(25).value).to.be.equal(26);
            });

            it("should return undefined for value at top of range", function () {
                expect(set.findLeastGreaterThan(34)).to.be.undefined;
            });

        });

    });
});
