"use string";

const { arrays } = adone.diff;

describe("diff/array", function () {
    describe("#arrays", function () {
        it("Should diff arrays", function () {
            const a = { a: 0 };
            const b = { b: 1 };
            const c = { c: 2 };
            const diffResult = arrays([a, b, c], [a, c, b]);
            console.log(diffResult);
            expect(diffResult).to.deep.equals([{ count: 1, value: [a] }, { count: 1, value: [c], removed: undefined, added: true }, { count: 1, value: [b] }, { count: 1, value: [c], removed: true, added: undefined }]);
        });
    });
});