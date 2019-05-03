const {
    diff
} = adone;

describe("root exports", () => {
    it("should export APIs", () => {
        expect(diff.Diff).to.exist;

        expect(diff.diffChars).to.exist;
        expect(diff.diffWords).to.exist;
        expect(diff.diffWordsWithSpace).to.exist;
        expect(diff.diffLines).to.exist;
        expect(diff.diffTrimmedLines).to.exist;
        expect(diff.diffSentences).to.exist;

        expect(diff.diffCss).to.exist;
        expect(diff.diffJson).to.exist;

        expect(diff.diffArrays).to.exist;

        expect(diff.structuredPatch).to.exist;
        expect(diff.createTwoFilesPatch).to.exist;
        expect(diff.createPatch).to.exist;
        expect(diff.applyPatch).to.exist;
        expect(diff.applyPatches).to.exist;
        expect(diff.parsePatch).to.exist;
        expect(diff.convertChangesToDMP).to.exist;
        expect(diff.convertChangesToXML).to.exist;
        expect(diff.canonicalize).to.exist;
    });
});
