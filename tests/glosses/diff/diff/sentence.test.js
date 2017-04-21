"use string";

const { sentences, convertChangesToXML } = adone.diff;

describe("diff/sentence", function () {
    describe("#sentences", function () {
        it("Should diff Sentences", function () {
            const diffResult = sentences("New Value.", "New ValueMoreData.");
            expect(convertChangesToXML(diffResult)).to.equal("<del>New Value.</del><ins>New ValueMoreData.</ins>");
        });

        it("should diff only the last sentence", function () {
            const diffResult = sentences("Here im. Rock you like old man.", "Here im. Rock you like hurricane.");
            expect(convertChangesToXML(diffResult)).to.equal("Here im. <del>Rock you like old man.</del><ins>Rock you like hurricane.</ins>");
        });
    });
});
