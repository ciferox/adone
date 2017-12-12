import { render } from "./util";

describe("templating", "nunjucks", "tests", () => {
    it("callable should detect callability", () => {
        const callable = render("{{ foo is callable }}", { foo() {
            return "!!!";
        } });
        const uncallable = render("{{ foo is not callable }}", { foo: "!!!" });
        expect(callable).to.be.equal("true");
        expect(uncallable).to.be.equal("true");
    });

    it("defined should detect definedness", () => {
        expect(render("{{ foo is defined }}")).to.be.equal("false");
        expect(render("{{ foo is not defined }}")).to.be.equal("true");
        expect(render("{{ foo is defined }}", { foo: null })).to.be.equal("true");
        expect(render("{{ foo is not defined }}", { foo: null })).to.be.equal("false");
    });

    it("undefined should detect undefinedness", () => {
        expect(render("{{ foo is undefined }}")).to.be.equal("true");
        expect(render("{{ foo is not undefined }}")).to.be.equal("false");
        expect(render("{{ foo is undefined }}", { foo: null })).to.be.equal("false");
        expect(render("{{ foo is not undefined }}", { foo: null })).to.be.equal("true");
    });

    it("none/null should detect strictly null values", () => {
        // required a change in lexer.js @ 220
        expect(render("{{ null is null }}")).to.be.equal("true");
        expect(render("{{ none is none }}")).to.be.equal("true");
        expect(render("{{ none is null }}")).to.be.equal("true");
        expect(render("{{ foo is null }}")).to.be.equal("false");
        expect(render("{{ foo is not null }}", { foo: null })).to.be.equal("false");
    });

    it("divisibleby should detect divisibility", () => {
        const divisible = render('{{ "6" is divisibleby(3) }}');
        const notDivisible = render("{{ 3 is not divisibleby(2) }}");
        expect(divisible).to.be.equal("true");
        expect(notDivisible).to.be.equal("true");
    });

    it("escaped should test whether or not something is escaped", () => {
        const escaped = render("{{ (foo | safe) is escaped }}", { foo: "foobarbaz" });
        const notEscaped = render("{{ foo is escaped }}", { foo: "foobarbaz" });
        expect(escaped).to.be.equal("true");
        expect(notEscaped).to.be.equal("false");
    });

    it("even should detect whether or not a number is even", () => {
        const fiveEven = render('{{ "5" is even }}');
        const fourNotEven = render("{{ 4 is not even }}");
        expect(fiveEven).to.be.equal("false");
        expect(fourNotEven).to.be.equal("false");
    });

    it("odd should detect whether or not a number is odd", () => {
        const fiveOdd = render('{{ "5" is odd }}');
        const fourNotOdd = render("{{ 4 is not odd }}");
        expect(fiveOdd).to.be.equal("true");
        expect(fourNotOdd).to.be.equal("true");
    });

    it("mapping should detect Maps or hashes", () => {
        const map1 = new Map();
        const map2 = {};
        const mapOneIsMapping = render("{{ map is mapping }}", { map: map1 });
        const mapTwoIsMapping = render("{{ map is mapping }}", { map: map2 });
        expect(mapOneIsMapping).to.be.equal("true");
        expect(mapTwoIsMapping).to.be.equal("true");
    });

    it("falsy should detect whether or not a value is falsy", () => {
        const zero = render("{{ 0 is falsy }}");
        const pancakes = render('{{ "pancakes" is not falsy }}');
        expect(zero).to.be.equal("true");
        expect(pancakes).to.be.equal("true");
    });

    it("truthy should detect whether or not a value is truthy", () => {
        const nullTruthy = render("{{ null is truthy }}");
        const pancakesNotTruthy = render('{{ "pancakes" is not truthy }}');
        expect(nullTruthy).to.be.equal("false");
        expect(pancakesNotTruthy).to.be.equal("false");
    });

    it("greaterthan than should detect whether or not a value is less than another", () => {
        const fiveGreaterThanFour = render('{{ "5" is greaterthan(4) }}');
        const fourNotGreaterThanTwo = render("{{ 4 is not greaterthan(2) }}");
        expect(fiveGreaterThanFour).to.be.equal("true");
        expect(fourNotGreaterThanTwo).to.be.equal("false");
    });

    it("ge should detect whether or not a value is greater than or equal to another", () => {
        const fiveGreaterThanEqualToFive = render('{{ "5" is ge(5) }}');
        const fourNotGreaterThanEqualToTwo = render("{{ 4 is not ge(2) }}");
        expect(fiveGreaterThanEqualToFive).to.be.equal("true");
        expect(fourNotGreaterThanEqualToTwo).to.be.equal("false");
    });

    it("lessthan than should detect whether or not a value is less than another", () => {
        const fiveLessThanFour = render('{{ "5" is lessthan(4) }}');
        const fourNotLessThanTwo = render("{{ 4 is not lessthan(2) }}");
        expect(fiveLessThanFour).to.be.equal("false");
        expect(fourNotLessThanTwo).to.be.equal("true");
    });

    it("le should detect whether or not a value is less than or equal to another", () => {
        const fiveLessThanEqualToFive = render('{{ "5" is le(5) }}');
        const fourNotLessThanEqualToTwo = render("{{ 4 is not le(2) }}");
        expect(fiveLessThanEqualToFive).to.be.equal("true");
        expect(fourNotLessThanEqualToTwo).to.be.equal("true");
    });

    it("ne should detect whether or not a value is not equal to another", () => {
        const five = render("{{ 5 is ne(5) }}");
        const four = render("{{ 4 is not ne(2) }}");
        expect(five).to.be.equal("false");
        expect(four).to.be.equal("false");
    });

    it("iterable should detect whether or not a value is iterable", () => {
        const iterable = (function* iterable() {
            return true;
        }());
        const generatorIsIterable = render("{{ fn is iterable }}", { fn: iterable });
        const arrayIsNotIterable = render("{{ arr is not iterable }}", { arr: [] });
        const mapIsIterable = render("{{ map is iterable }}", { map: new Map() });
        const setIsNotIterable = render("{{ set is not iterable }}", { set: new Set() });
        expect(generatorIsIterable).to.be.equal("true");
        expect(arrayIsNotIterable).to.be.equal("false");
        expect(mapIsIterable).to.be.equal("true");
        expect(setIsNotIterable).to.be.equal("false");
    });

    it("number should detect whether a value is numeric", () => {
        const num = render("{{ 5 is number }}");
        const str = render('{{ "42" is number }}');
        expect(num).to.be.equal("true");
        expect(str).to.be.equal("false");
    });

    it("string should detect whether a value is a string", () => {
        const num = render("{{ 5 is string }}");
        const str = render('{{ "42" is string }}');
        expect(num).to.be.equal("false");
        expect(str).to.be.equal("true");
    });

    it("equalto should detect value equality", () => {
        const same = render("{{ 1 is equalto(2) }}");
        const notSame = render("{{ 2 is not equalto(2) }}");
        expect(same).to.be.equal("false");
        expect(notSame).to.be.equal("false");
    });

    it("sameas should alias to equalto", () => {
        const obj = {};
        const same = render("{{ obj1 is sameas(obj2) }}", { obj1: obj, obj2: obj });
        expect(same).to.be.equal("true");
    });

    it("lower should detect whether or not a string is lowercased", () => {
        expect(render('{{ "foobar" is lower }}')).to.be.equal("true");
        expect(render('{{ "Foobar" is lower }}')).to.be.equal("false");
    });

    it("upper should detect whether or not a string is uppercased", () => {
        expect(render('{{ "FOOBAR" is upper }}')).to.be.equal("true");
        expect(render('{{ "Foobar" is upper }}')).to.be.equal("false");
    });
});
