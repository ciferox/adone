const {
    inspect
} = adone;

describe("inspect", "function", () => {
    it("nurmal anonymouse function without parameters", () => {
        const code = "function () {}";
        const str = inspect.function(code);

        assert.equal(str, "Function ()");
    });

    it("nurmal named function without parameters", () => {
        const code = "function abc() {}";
        const str = inspect.function(code);

        assert.equal(str, "Function abc()");
    });

    it("nurmal named function with parameters", () => {
        const code = "function abc(a, b) {}";
        const str = inspect.function(code);

        assert.equal(str, "Function abc(a, b)");
    });

    it("arrow anonymous function without parameters", () => {
        const code = "() => {}";
        const str = inspect.function(code);

        assert.equal(str, "() => {...}");
    });

    it("arrow anonymouse function with parameters", () => {
        const code = "(a, b) => {}";
        const str = inspect.function(code);

        assert.equal(str, "(a, b) => {...}");
    });

    it("runtime arrow anonymouse function with parameters", () => {
        const sum = (a, b) => a + b;
        const str = inspect.function(sum);

        assert.equal(str, "sum(a, b) => {...}");
    });

    it("async function without parameters", () => {
        const sum = "async function () { return 12; }";
        const str = inspect.function(sum);

        assert.equal(str, "Async Function ()");
    });

    it("async function with parameters", () => {
        const sum = "async function (a, b) { return a + b; }";
        const str = inspect.function(sum);

        assert.equal(str, "Async Function (a, b)");
    });

    it("arrow async function without parameters", () => {
        const sum = "async () => {}";
        const str = inspect.function(sum);

        assert.equal(str, "Async () => {...}");
    });

    it("arrow async function with parameters", () => {
        const sum = "async (a, b, c) => a + b + c";
        const str = inspect.function(sum);

        assert.equal(str, "Async (a, b, c) => {...}");
    });

    it("generator anonymous function without parameters", () => {
        const sum = "function* () { return 12;}";
        const str = inspect.function(sum);

        assert.equal(str, "Function* ()");
    });

    it("generator named function without parameters", () => {
        const sum = "function* sum() { return 12;}";
        const str = inspect.function(sum);

        assert.equal(str, "Function* sum()");
    });

    it("generator named function without parameters", () => {
        const sum = "function* sum(a, b) { return a + b;}";
        const str = inspect.function(sum);

        assert.equal(str, "Function* sum(a, b)");
    });

    it("runtime anonymous generator function", () => {
        const str = inspect.function((function* (a, b) { return a + b; }));

        assert.equal(str, "Function* (a, b)");
    });

    it("runtime named generator function (1)", () => {
        function* sum(a, b) { return a + b; };
        const str = inspect.function(sum);

        assert.equal(str, "Function* sum(a, b)");
    });

    it("runtime named generator function (1)", () => {
        const sum = function* (a, b) { return a + b; };
        const str = inspect.function(sum);

        assert.equal(str, "Function* sum(a, b)");
    });

    it("normal function with default parameters", () => {
        const code = "function sum(a, b = 2, c = {}) { c.sum = a + b; }";
        const str = inspect.function(code);

        assert.equal(str, "Function sum(a, b = 2, c = {})");
    });

    it("arrow function with default parameters", () => {
        const code = "(a, b = 2, c = {}) => { c.sum = a + b; }";
        const str = inspect.function(code);

        assert.equal(str, "(a, b = 2, c = {}) => {...}");
    });

    it("function with stread args", () => {
        const keys = function (object, { enumOnly = true, followProto = false, all = false } = {}) { };
        const str = inspect.function(keys);

        assert.equal(str, "Function keys(object, {enumOnly = true,followProto = false,all = false} = {})");
    });
});
