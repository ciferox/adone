describe("glosses", "diff", "arrays", () => {
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
});
