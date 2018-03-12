const {
    is,
    fake,
    lodash: _
} = adone;

describe("fake", "random", () => {
    describe("number", () => {

        it("returns a random number given a maximum value as Number", () => {
            const max = 10;
            assert.ok(fake.random.number(max) <= max);
        });

        it("returns a random number given a maximum value as Object", () => {
            const options = { max: 10 };
            assert.ok(fake.random.number(options) <= options.max);
        });

        it("returns a random number given a maximum value of 0", () => {
            const options = { max: 0 };
            assert.ok(fake.random.number(options) === 0);
        });

        it("returns a random number given a negative number minimum and maximum value of 0", () => {
            const options = { min: -100, max: 0 };
            assert.ok(fake.random.number(options) <= options.max);
        });

        it("returns a random number between a range", () => {
            const options = { min: 22, max: 33 };
            for (let i = 0; i < 100; i++) {
                const randomNumber = fake.random.number(options);
                assert.ok(randomNumber >= options.min);
                assert.ok(randomNumber <= options.max);
            }
        });

        it("provides numbers with a given precision", () => {
            const options = { min: 0, max: 1.5, precision: 0.5 };
            const results = _.chain(_.range(50))
                .map(() => {
                    return fake.random.number(options);
                })
                .uniq()
                .value()
                .sort();

            assert.ok(_.includes(results, 0.5));
            assert.ok(_.includes(results, 1.0));

            assert.equal(results[0], 0);
            assert.equal(_.last(results), 1.5);

        });

        it("provides numbers with a with exact precision", () => {
            const options = { min: 0.5, max: 0.99, precision: 0.01 };
            for (let i = 0; i < 100; i++) {
                const number = fake.random.number(options);
                assert.equal(number, Number(number.toFixed(2)));
            }
        });

        it("should not modify the input object", () => {
            const min = 1;
            const max = 2;
            const opts = {
                min,
                max
            };

            fake.random.number(opts);

            assert.equal(opts.min, min);
            assert.equal(opts.max, max);
        });

        it("should return deterministic results when seeded", () => {
            fake.seed(100);
            const name = fake.name.findName();
            assert.equal(name, "Eva Jenkins");
        });
    });

    describe("arrayElement", () => {
        it("returns a random element in the array", () => {
            const testArray = ["hello", "to", "you", "my", "friend"];
            assert.ok(testArray.indexOf(fake.random.arrayElement(testArray)) > -1);
        });

        it("returns a random element in the array when there is only 1", () => {
            const testArray = ["hello"];
            assert.ok(testArray.indexOf(fake.random.arrayElement(testArray)) > -1);
        });
    });

    describe("arrayElements", () => {
        it("returns a subset with random elements in the array", () => {
            const testArray = ["hello", "to", "you", "my", "friend"];
            const subset = fake.random.arrayElements(testArray);

            // Check length
            assert.ok(subset.length >= 1 && subset.length <= testArray.length);

            // Check elements
            subset.forEach((element) => {
                assert.ok(testArray.indexOf(element) > -1);
            });

            // Check uniqueness
            subset.forEach(function (element) {
                assert.ok(!this.hasOwnProperty(element));
                this[element] = true;
            }, {});
        });

        it("returns a subset of fixed length with random elements in the array", () => {
            const testArray = ["hello", "to", "you", "my", "friend"];
            const subset = fake.random.arrayElements(testArray, 3);

            // Check length
            assert.ok(subset.length === 3);

            // Check elements
            subset.forEach((element) => {
                assert.ok(testArray.indexOf(element) > -1);
            });

            // Check uniqueness
            subset.forEach(function (element) {
                assert.ok(!this.hasOwnProperty(element));
                this[element] = true;
            }, {});
        });
    });

    describe("UUID", () => {
        it("should generate a valid UUID", () => {
            const UUID = fake.random.uuid();
            const RFC4122 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
            assert.ok(RFC4122.test(UUID));
        });
    });

    describe("boolean", () => {
        it("should generate a boolean value", () => {
            const bool = fake.random.boolean();
            assert.ok(is.boolean(bool));
        });
    });

    describe("semver", () => {
        const semver = fake.system.semver();

        it("should generate a string", () => {
            assert.ok(is.string(semver));
        });

        it("should generate a valid semver", () => {
            assert.ok(/^\d+\.\d+\.\d+$/.test(semver));
        });
    });

    describe("alphaNumeric", () => {
        const alphaNumeric = fake.random.alphaNumeric;

        it("should generate single character when no additional argument was provided", () => {
            assert.ok(alphaNumeric().length === 1);
        });

        it("should generate many random characters", () => {
            assert.ok(alphaNumeric(5).length === 5);
        });
    });

    describe("hexaDecimal", () => {
        const hexaDecimal = fake.random.hexaDecimal;

        it("should generate single hex character when no additional argument was provided", () => {
            const hex = hexaDecimal();
            assert.ok(hex.match(/^(0x)[0-9a-f]{1}$/i));
        });

        it("should generate a random hex string", () => {
            const hex = hexaDecimal(5);
            assert.ok(hex.match(/^(0x)[0-9a-f]+$/i));
        });
    });
});
