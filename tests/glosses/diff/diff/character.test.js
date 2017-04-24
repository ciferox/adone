describe("glosses", "diff", "chars", () => {
    const { diff: { chars, util: { convertChangesToXML } } } = adone;

    it("Should diff chars", () => {
        const diffResult = chars("New Value.", "New ValueMoreData.");
        expect(convertChangesToXML(diffResult)).to.equal("New Value<ins>MoreData</ins>.");
    });

    describe("case insensitivity", () => {
        it("is considered when there's no difference", () => {
            const diffResult = chars("New Value.", "New value.", { ignoreCase: true });
            expect(convertChangesToXML(diffResult)).to.equal("New value.");
        });

        it("is considered when there's a difference", () => {
            const diffResult = chars("New Values.", "New value.", { ignoreCase: true });
            expect(convertChangesToXML(diffResult)).to.equal("New value<del>s</del>.");
        });
    });
});
