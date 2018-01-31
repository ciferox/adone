const {
    fake
} = adone;

describe("helpers.js", () => {
    describe("replaceSymbolWithNumber()", () => {
        context("when no symbol passed in", () => {
            it("uses '#' by default", () => {
                const num = fake.helpers.replaceSymbolWithNumber("#AB");
                assert.ok(num.match(/\dAB/));
            });
        });

        context("when symbol passed in", () => {
            it("replaces that symbol with integers", () => {
                const num = fake.helpers.replaceSymbolWithNumber("#AB", "A");
                assert.ok(num.match(/#\dB/));
            });
        });
    });

    describe("replaceSymbols()", () => {
        context("when '*' passed", () => {
            it("replaces it with alphanumeric", () => {
                const num = fake.helpers.replaceSymbols("*AB");
                assert.ok(num.match(/\wAB/));
            });
        });
    });

    describe("shuffle()", () => {
        it("the output is the same length as the input", () => {
            spy(fake.random, "number");
            const shuffled = fake.helpers.shuffle(["a", "b"]);
            assert.ok(shuffled.length === 2);
            assert.ok(fake.random.number.calledWith(1));
            fake.random.number.restore();
        });

        it("empty array returns empty array", () => {
            const shuffled = fake.helpers.shuffle([]);
            assert.ok(shuffled.length === 0);
        });
    });

    describe("slugify()", () => {
        it("removes unwanted characters from URI string", () => {
            assert.equal(fake.helpers.slugify("Aiden.Harªann"), "Aiden.Harann");
            assert.equal(fake.helpers.slugify("d'angelo.net"), "dangelo.net");
        });
    });

    describe("createCard()", () => {
        it("returns an object", () => {
            const card = fake.helpers.createCard();
            assert.ok(typeof card === "object");
        });
    });

    describe("userCard()", () => {
        it("returns an object", () => {
            const card = fake.helpers.userCard();
            assert.ok(typeof card === "object");
        });
    });

    // Make sure we keep this function for backward-compatibility.
    describe("randomize()", () => {
        it("returns a random element from an array", () => {
            const arr = ["a", "b", "c"];
            const elem = fake.helpers.randomize(arr);
            assert.ok(elem);
            assert.ok(arr.indexOf(elem) !== -1);
        });
    });

    describe("replaceCreditCardSymbols()", () => {
        const luhnCheck = require("./support/luhnCheck.js");
        it("returns a credit card number given a schema", () => {
            const number = fake.helpers.replaceCreditCardSymbols("6453-####-####-####-###L");
            assert.ok(number.match(/^6453\-([0-9]){4}\-([0-9]){4}\-([0-9]){4}\-([0-9]){4}$/));
            assert.ok(luhnCheck(number));
        });
        it("supports different symbols", () => {
            const number = fake.helpers.replaceCreditCardSymbols("6453-****-****-****-***L", "*");
            assert.ok(number.match(/^6453\-([0-9]){4}\-([0-9]){4}\-([0-9]){4}\-([0-9]){4}$/));
            assert.ok(luhnCheck(number));
        });
        it("handles regexp style input", () => {
            let number = fake.helpers.replaceCreditCardSymbols("6453-*{4}-*{4}-*{4}-*{3}L", "*");
            assert.ok(number.match(/^6453\-([0-9]){4}\-([0-9]){4}\-([0-9]){4}\-([0-9]){4}$/));
            assert.ok(luhnCheck(number));
            number = fake.helpers.replaceCreditCardSymbols("645[5-9]-#{4,6}-#{1,2}-#{4,6}-#{3}L");
            assert.ok(number.match(/^645[5-9]\-([0-9]){4,6}\-([0-9]){1,2}\-([0-9]){4,6}\-([0-9]){4}$/));
            assert.ok(luhnCheck(number));
        });
    });

    describe("regexpStyleStringParse()", () => {
        it("returns an empty string when called without param", () => {
            assert.ok(fake.helpers.regexpStyleStringParse() === "");
        });
        it("deals with range repeat", () => {
            const string = fake.helpers.regexpStyleStringParse("#{5,10}");
            assert.ok(string.length <= 10 && string.length >= 5);
            assert.ok(string.match(/^\#{5,10}$/));
        });
        it("flips the range when min > max", () => {
            const string = fake.helpers.regexpStyleStringParse("#{10,5}");
            assert.ok(string.length <= 10 && string.length >= 5);
            assert.ok(string.match(/^\#{5,10}$/));
        });
        it("repeats string {n} number of times", () => {
            assert.ok(fake.helpers.regexpStyleStringParse("%{10}") === fake.helpers.repeatString("%", 10));
            assert.ok(fake.helpers.regexpStyleStringParse("%{30}") === fake.helpers.repeatString("%", 30));
            assert.ok(fake.helpers.regexpStyleStringParse("%{5}") === fake.helpers.repeatString("%", 5));
        });
        it("creates a numerical range", () => {
            const string = fake.helpers.regexpStyleStringParse("Hello[0-9]");
            assert.ok(string.match(/^Hello[0-9]$/));
        });
        it("deals with multiple tokens in one string", () => {
            const string = fake.helpers.regexpStyleStringParse("Test#{5}%{2,5}Testing**[1-5]**{10}END");
            assert.ok(string.match(/^Test\#{5}%{2,5}Testing\*\*[1-5]\*\*{10}END$/));
        });
    });

    describe("createTransaction()", () => {
        it("should create a random transaction", () => {
            const transaction = fake.helpers.createTransaction();
            assert.ok(transaction);
            assert.ok(transaction.amount);
            assert.ok(transaction.date);
            assert.ok(transaction.business);
            assert.ok(transaction.name);
            assert.ok(transaction.type);
            assert.ok(transaction.account);
        });
    });
});
