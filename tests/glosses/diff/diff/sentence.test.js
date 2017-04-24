describe("glosses", "diff", "sentences", () => {
    const { diff: { sentences, util: { convertChangesToXML } } } = adone;

    it("Should diff Sentences", () => {
        const diffResult = sentences("New Value.", "New ValueMoreData.");
        expect(convertChangesToXML(diffResult)).to.equal("<del>New Value.</del><ins>New ValueMoreData.</ins>");
    });

    it("should diff only the last sentence", () => {
        const diffResult = sentences("Here im. Rock you like old man.", "Here im. Rock you like hurricane.");
        expect(convertChangesToXML(diffResult)).to.equal("Here im. <del>Rock you like old man.</del><ins>Rock you like hurricane.</ins>");
    });
});
