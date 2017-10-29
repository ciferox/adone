describe("diff", "arrays", () => {
    const { diff: { arrays } } = adone;

    it("Should diff arrays", () => {
        const a = { a: 0 };
        const b = { b: 1 };
        const c = { c: 2 };
        const diffResult = arrays([a, b, c], [a, c, b]);
        expect(diffResult).to.deep.equals([
            { count: 1, value: [a] },
            { count: 1, value: [c], removed: undefined, added: true },
            { count: 1, value: [b] },
            { count: 1, value: [c], removed: true, added: undefined }
        ]);
    });

    it("should diff falsey values", () => {
        const a = false;
        const b = 0;
        const c = "";
        // Example sequences from Myers 1986
        const arrayA = [c, b, a, b, a, c];
        const arrayB = [a, b, c, a, b, b, a];
        const diffResult = arrays(arrayA, arrayB);
        expect(diffResult).to.deep.equals([
            { count: 2, value: [a, b], removed: undefined, added: true },
            { count: 1, value: [c] },
            { count: 1, value: [b], removed: true, added: undefined },
            { count: 2, value: [a, b] },
            { count: 1, value: [b], removed: undefined, added: true },
            { count: 1, value: [a] },
            { count: 1, value: [c], removed: true, added: undefined }
        ]);
    });

    it("Should diff arrays with comparator", () => {
        const a = { a: 0 };
        const b = { a: 1 };
        const c = { a: 2 };
        const d = { a: 3 };
        const comparator = (left, right) => left.a === right.a;
        const diffResult = arrays([a, b, c], [a, b, d], { comparator });
        console.log(diffResult);
        expect(diffResult).to.deep.equals([
            { count: 2, value: [a, b] },
            { count: 1, value: [c], removed: true, added: undefined },
            { count: 1, value: [d], removed: undefined, added: true }
        ]);
    });
});
