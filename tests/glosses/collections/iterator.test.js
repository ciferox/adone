const { Iterator } = adone.collection;

describe("Iterator", function () {

    shouldWorkWithConstructor(function withoutNew(iterable) {
        return new Iterator(iterable);
    });

    shouldWorkWithConstructor(function withNew(iterable) {
        return new Iterator(iterable);
    });

    describe("Iterator.cycle", function () {

        it("should work", function () {
            const iterator = Iterator.cycle([1, 2, 3]);
            for (let i = 0; i < 10; i++) {
                expect(iterator.next().value).to.be.equal(1);
                expect(iterator.next().value).to.be.equal(2);
                expect(iterator.next().value).to.be.equal(3);
            }
        });

        it("should work with specified number of times", function () {
            const iterator = Iterator.cycle([1, 2, 3], 2);
            for (let i = 0; i < 2; i++) {
                expect(iterator.next().value).to.be.equal(1);
                expect(iterator.next().value).to.be.equal(2);
                expect(iterator.next().value).to.be.equal(3);
            }
            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });

        it("should work with specified 0 times", function () {
            const iterator = Iterator.cycle([1, 2, 3], 0);
            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });

        it("should work with specified -1 times", function () {
            const iterator = Iterator.cycle([1, 2, 3], 0);
            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });

    });

    describe("Iterator.repeat", function () {

        it("should repeat a value indefinite times by default", function () {
            const iterator = Iterator.repeat(1);
            for (let i = 0; i < 10; i++) {
                expect(iterator.next().value).to.be.eql(1);
            }
        });

        it("should repeat a value specified times", function () {
            const iterator = Iterator.repeat(1, 3);
            for (let i = 0; i < 3; i++) {
                expect(iterator.next().value).to.be.eql(1);
            }
            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });

    });

    describe("Iterator.concat", function () {
        it("should work", function () {
            const iterator = Iterator.concat([
                new Iterator([1, 2, 3]),
                new Iterator([4, 5, 6]),
                new Iterator([7, 8, 9])
            ]);
            for (let i = 0; i < 9; i++) {
                expect(iterator.next().value).to.be.eql(i + 1);
            }
            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });
    });

    describe("Iterator.chain", function () {
        it("should work", function () {
            const iterator = Iterator.chain(
                new Iterator([1, 2, 3]),
                new Iterator([4, 5, 6]),
                new Iterator([7, 8, 9])
            );
            for (let i = 0; i < 9; i++) {
                expect(iterator.next().value).to.be.eql(i + 1);
            }
            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });
    });

    describe("Iterator.unzip", function () {
        it("should work", function () {
            const iterator = Iterator.unzip([
                new Iterator([0, "A", "x"]),
                new Iterator([1, "B", "y", "I"]),
                new Iterator([2, "C"])
            ]);

            expect(iterator.next().value).to.be.eql([0, 1, 2]);
            expect(iterator.next().value).to.be.eql(["A", "B", "C"]);

            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });
    });

    describe("Iterator.zip", function () {
        it("should work", function () {
            const iterator = Iterator.zip(
                new Iterator([0, "A", "x"]),
                new Iterator([1, "B", "y", "I"]),
                new Iterator([2, "C"])
            );

            expect(iterator.next().value).to.be.eql([0, 1, 2]);
            expect(iterator.next().value).to.be.eql(["A", "B", "C"]);

            expect(iterator.next().done).to.be.true;
            expect(iterator.next().done).to.be.true;
        });
    });

    describe("Iterator.range", function () {
    });

    describe("Iterator.count", function () {
    });

});

function shouldWorkWithConstructor(Iterator) {

    function definiteIterator() {
        return new Iterator([1, 2, 3]);
    }

    function indefiniteIterator() {
        let n = 0;
        return new Iterator(function () {
            return {
                done: false,
                value: n++
            };
        });
    }

    it("should iterate an array", function () {
        const iterator = new Iterator([1, 2, 3]);
        expect(iterator.next().value).to.be.eql(1);
        expect(iterator.next().value).to.be.eql(2);
        expect(iterator.next().value).to.be.eql(3);
        expect(iterator.next().done).to.be.true;
        expect(iterator.next().done).to.be.true;
    });

    it("should iterate an sparse array", function () {
        const array = [];
        array[0] = 1;
        array[100] = 2;
        array[1000] = 3;
        const iterator = new Iterator(array);
        expect(iterator.next().value).to.be.eql(1);
        expect(iterator.next().value).to.be.eql(2);
        expect(iterator.next().value).to.be.eql(3);
        expect(iterator.next().done).to.be.true;
        expect(iterator.next().done).to.be.true;
    });

    it("should iterate a string", function () {
        const iterator = new Iterator("abc");
        expect(iterator.next().value).to.be.eql("a");
        expect(iterator.next().value).to.be.eql("b");
        expect(iterator.next().value).to.be.eql("c");
        expect(iterator.next().done).to.be.true;
        expect(iterator.next().done).to.be.true;
    });

    it("should gracefully fail to iterate null", function () {
        expect(function () {
            new Iterator(null);
        }).to.throw();
    });

    it("should gracefully fail to iterate undefined", function () {
        expect(function () {
            new Iterator();
        }).to.throw();
    });

    it("should gracefully fail to iterate a number", function () {
        expect(function () {
            new Iterator(42);
        }).to.throw();
    });

    it("should gracefully pass an existing iterator through", function () {
        let iterator = new Iterator([1, 2, 3]);
        iterator = new Iterator(iterator);
        expect(iterator.next().value).to.be.eql(1);
        expect(iterator.next().value).to.be.eql(2);
        expect(iterator.next().value).to.be.eql(3);
        expect(iterator.next().done).to.be.true;
        expect(iterator.next().done).to.be.true;
    });

    it("should iterate an iterator", function () {
        let iterator = new Iterator({
            iterate: function () {
                return new Iterator([1, 2, 3]);
            }
        });
        iterator = new Iterator(iterator);
        expect(iterator.next().value).to.be.eql(1);
        expect(iterator.next().value).to.be.eql(2);
        expect(iterator.next().value).to.be.eql(3);
        expect(iterator.next().done).to.be.true;
        expect(iterator.next().done).to.be.true;
    });

    it("should iterate an iterable", function () {
        let n = 0;
        const iterator = new Iterator({
            next: function next() {
                if (++n > 3) {
                    return { value: void 0, done: true };
                } else {
                    return { value: n, done: false };
                }
            }
        });
        expect(iterator.next().value).to.be.eql(1);
        expect(iterator.next().value).to.be.eql(2);
        expect(iterator.next().value).to.be.eql(3);
        expect(iterator.next().done).to.be.true;
        expect(iterator.next().done).to.be.true;
    });

    it("should create an iterator from a function", function () {
        let n = 0;
        const iterator = new Iterator(function next() {
            if (++n > 3) {
                return { value: void 0, done: true };
            } else {
                return { value: n, done: false };
            }
        });
        expect(iterator.next().value).to.be.eql(1);
        expect(iterator.next().value).to.be.eql(2);
        expect(iterator.next().value).to.be.eql(3);
        expect(iterator.next().done).to.be.true;
        expect(iterator.next().done).to.be.true;
    });

    describe("reduce", function () {
        it("should work", function () {
            const iterator = definiteIterator();
            let count = 0;
            const result = iterator.reduce(function (result, value, key, object) {
                expect(value).to.be.equal(count + 1);
                expect(key).to.be.equal(count);
                expect(object).to.be.equal(iterator);
                count++;
                return value + 1;
            }, 0);
            expect(result).to.be.equal(4);
        });
    });

    describe("forEach", function () {
        it("should work", function () {
            const iterator = definiteIterator();
            let count = 0;
            iterator.forEach(function (value, key, object) {
                expect(value).to.be.equal(count + 1);
                expect(key).to.be.equal(count);
                expect(object).to.be.equal(iterator);
                count++;
            });
            expect(count).to.be.equal(3);
        });
    });

    describe("map", function () {
        it("should work", function () {
            const iterator = definiteIterator();
            let count = 0;
            const result = iterator.map(function (value, key, object) {
                expect(value).to.be.equal(count + 1);
                expect(key).to.be.equal(count);
                expect(object).to.be.equal(iterator);
                count++;
                return "abc".charAt(key);
            });
            expect(result).to.be.eql(["a", "b", "c"]);
            expect(count).to.be.equal(3);
        });
    });

    describe("filter", function () {
        it("should work", function () {
            const iterator = definiteIterator();
            let count = 0;
            const result = iterator.filter(function (value, key, object) {
                expect(value).to.be.equal(count + 1);
                expect(key).to.be.equal(count);
                expect(object).to.be.equal(iterator);
                count++;
                return value === 2;
            });
            expect(result).to.be.eql([2]);
            expect(count).to.be.equal(3);
        });
    });

    describe("every", function () {
        it("should work", function () {
            expect(new Iterator([1, 2, 3]).every(function (n) {
                return n < 10;
            })).to.be.true;
            expect(new Iterator([1, 2, 3]).every(function (n) {
                return n > 1;
            })).to.be.equal(false);
        });
    });

    describe("some", function () {
        it("should work", function () {
            expect(new Iterator([1, 2, 3]).some(function (n) {
                return n === 2;
            })).to.be.true;
            expect(new Iterator([1, 2, 3]).some(function (n) {
                return n > 10;
            })).to.be.equal(false);
        });
    });

    describe("any", function () {
        [
            [[false, false], false],
            [[false, true], true],
            [[true, false], true],
            [[true, true], true]
        ].forEach(function (test) {
            test = new Iterator(test);
            const input = test.next().value;
            const output = test.next().value;
            it("any of " + JSON.stringify(input) + " should be " + output, function () {
                expect(new Iterator(input).any()).to.be.eql(output);
            });
        });
    });

    describe("all", function () {
        [
            [[false, false], false],
            [[false, true], false],
            [[true, false], false],
            [[true, true], true]
        ].forEach(function (test) {
            test = new Iterator(test);
            const input = test.next().value;
            const output = test.next().value;
            it("all of " + JSON.stringify(input) + " should be " + output, function () {
                expect(new Iterator(input).all()).to.be.eql(output);
            });
        });
    });

    describe("min", function () {
        it("should work", function () {
            expect(definiteIterator().min()).to.be.equal(1);
        });
    });

    describe("max", function () {
        it("should work", function () {
            expect(definiteIterator().max()).to.be.equal(3);
        });
    });

    describe("sum", function () {
        it("should work", function () {
            expect(definiteIterator().sum()).to.be.equal(6);
        });
    });

    describe("average", function () {
        it("should work", function () {
            expect(definiteIterator().average()).to.be.equal(2);
        });
    });

    describe("flatten", function () {
        it("should work", function () {
            expect(
                new Iterator([
                    definiteIterator(),
                    definiteIterator(),
                    definiteIterator()
                ]).flatten()
            ).to.be.eql([
                1, 2, 3,
                1, 2, 3,
                1, 2, 3
            ]);
        });
    });

    describe("zip", function () {
        it("should work", function () {
            const cardinals = definiteIterator().mapIterator(function (n) {
                return n - 1;
            });
            const ordinals = definiteIterator();
            expect(cardinals.zip(ordinals)).to.be.eql([
                [0, 1],
                [1, 2],
                [2, 3]
            ]);
        });
    });

    describe("enumerate", function () {

        it("should work with default start", function () {
            const cardinals = definiteIterator();
            expect(cardinals.enumerate()).to.be.eql([
                [0, 1],
                [1, 2],
                [2, 3]
            ]);
        });

        it("should work with given start", function () {
            const cardinals = definiteIterator();
            expect(cardinals.enumerate(1)).to.be.eql([
                [1, 1],
                [2, 2],
                [3, 3]
            ]);
        });

    });

    describe("sorted", function () {
        it("should work", function () {
            expect(new Iterator([5, 2, 4, 1, 3]).sorted()).to.be.eql([1, 2, 3, 4, 5]);
        });
    });

    describe("group", function () {
        it("should work", function () {
            expect(new Iterator([5, 2, 4, 1, 3]).group(function (n) {
                return n % 2 === 0;
            })).to.be.eql([
                [false, [5, 1, 3]],
                [true, [2, 4]]
            ]);
        });
    });

    describe("reversed", function () {
        it("should work", function () {
            expect(new Iterator([5, 2, 4, 1, 3]).reversed()).to.be.eql([3, 1, 4, 2, 5]);
        });
    });

    describe("toArray", function () {
        it("should work", function () {
            expect(new Iterator([5, 2, 4, 1, 3]).toArray()).to.be.eql([5, 2, 4, 1, 3]);
        });
    });

    describe("toObject", function () {
        it("should work", function () {
            expect(new Iterator("AB").toObject()).to.be.eql({
                0: "A",
                1: "B"
            });
        });
    });

    describe("mapIterator", function () {

        it("should work", function () {
            const iterator = indefiniteIterator()
                .mapIterator(function (n, i, o) {
                    return n * 2;
                });
            expect(iterator.next().value).to.be.equal(0);
            expect(iterator.next().value).to.be.equal(2);
            expect(iterator.next().value).to.be.equal(4);
            expect(iterator.next().value).to.be.equal(6);
        });

        it("should pass the correct arguments to the callback", function () {
            const iterator = indefiniteIterator();
            const result = iterator.mapIterator(function (n, i, o) {
                expect(i).to.be.equal(n);
                expect(o).to.be.equal(iterator);
                return n * 2;
            });
            result.next();
            result.next();
            result.next();
            result.next();
        });

    });

    describe("filterIterator", function () {

        it("should work", function () {
            const iterator = indefiniteIterator()
                .filterIterator(function (n, i, o) {
                    expect(i).to.be.equal(n);
                    //expect(o).to.be.equal(iterator);
                    return n % 2 === 0;
                });
            expect(iterator.next().value).to.be.equal(0);
            expect(iterator.next().value).to.be.equal(2);
            expect(iterator.next().value).to.be.equal(4);
            expect(iterator.next().value).to.be.equal(6);
        });

        it("should pass the correct arguments to the callback", function () {
            const iterator = indefiniteIterator();
            const result = iterator.filterIterator(function (n, i, o) {
                expect(i).to.be.equal(n);
                expect(o).to.be.equal(iterator);
                return n * 2;
            });
            result.next();
            result.next();
            result.next();
            result.next();
        });

    });

    describe("concat", function () {
        it("should work", function () {
            const iterator = definiteIterator().concat(definiteIterator());
            expect(iterator.next().value).to.be.equal(1);
            expect(iterator.next().value).to.be.equal(2);
            expect(iterator.next().value).to.be.equal(3);
            expect(iterator.next().value).to.be.equal(1);
            expect(iterator.next().value).to.be.equal(2);
            expect(iterator.next().value).to.be.equal(3);
            expect(iterator.next().done).to.be.true;
        });
    });

    describe("dropWhile", function () {

        it("should work", function () {
            const iterator = indefiniteIterator()
                .dropWhile(function (n) {
                    return n < 10;
                });
            expect(iterator.next().value).to.be.equal(10);
            expect(iterator.next().value).to.be.equal(11);
            expect(iterator.next().value).to.be.equal(12);
        });

        it("should pass the correct arguments to the callback", function () {
            const iterator = indefiniteIterator();
            const result = iterator.dropWhile(function (n, i, o) {
                expect(i).to.be.equal(n);
                expect(o).to.be.equal(iterator);
            });
            result.next();
            result.next();
            result.next();
        });

    });

    describe("takeWhile", function () {

        it("should work", function () {
            const iterator = indefiniteIterator()
                .takeWhile(function (n) {
                    return n < 3;
                });
            expect(iterator.next().value).to.be.equal(0);
            expect(iterator.next().value).to.be.equal(1);
            expect(iterator.next().value).to.be.equal(2);
            expect(iterator.next().done).to.be.true;
        });

        it("should pass the correct arguments to the callback", function () {
            const iterator = indefiniteIterator();
            const result = iterator.takeWhile(function (n, i, o) {
                expect(i).to.be.equal(n);
                expect(o).to.be.equal(iterator);
                return n < 3;
            });
            result.next();
            result.next();
            result.next();
        });

    });

    describe("zipIterator", function () {

        it("should work", function () {
            const cardinals = indefiniteIterator();
            const ordinals = indefiniteIterator().mapIterator(function (n) {
                return n + 1;
            });
            const iterator = cardinals.zipIterator(ordinals);
            expect(iterator.next().value).to.be.eql([0, 1]);
            expect(iterator.next().value).to.be.eql([1, 2]);
            expect(iterator.next().value).to.be.eql([2, 3]);
        });

        it("should work, even for crazy people", function () {
            const cardinals = indefiniteIterator();
            const iterator = cardinals.zipIterator(cardinals, cardinals);
            expect(iterator.next().value).to.be.eql([0, 1, 2]);
            expect(iterator.next().value).to.be.eql([3, 4, 5]);
            expect(iterator.next().value).to.be.eql([6, 7, 8]);
        });
    });

    describe("enumerateIterator", function () {
        it("should work", function () {
            const ordinals = indefiniteIterator().mapIterator(function (n) {
                return n + 1;
            });
            const iterator = ordinals.enumerateIterator();
            expect(iterator.next().value).to.be.eql([0, 1]);
            expect(iterator.next().value).to.be.eql([1, 2]);
            expect(iterator.next().value).to.be.eql([2, 3]);
        });
    });

}
