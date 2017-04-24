describe("glosses", "diff", "convert", "convertToDMP", () => {
    const { diff: { util: { convertChangesToDMP }, words } } = adone;

    it("should output diff-match-patch format", () => {
        const diffResult = words("New Value  ", "New  ValueMoreData ");

        expect(convertChangesToDMP(diffResult)).to.eql([[0, "New  "], [-1, "Value"], [1, "ValueMoreData"], [0, " "]]);
    });
});
