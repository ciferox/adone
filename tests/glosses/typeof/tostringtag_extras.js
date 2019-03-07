const {
    typeOf,
    is
} = adone;

const symbolExists = is.function(Symbol);
const symbolToStringTagExists = symbolExists && !is.undefined(Symbol.toStringTag);

const describeIf = (condition) => {
    return condition ? describe : describe.skip;
};

describeIf(symbolToStringTagExists)("toStringTag extras", () => {
    it("supports toStringTag on arrays", () => {
        assert(typeOf([]) === "Array");
        const arr = [];
        arr[Symbol.toStringTag] = "foo";
        assert(typeOf(arr) === "foo", 'type(arr) === "foo"');
    });
});
