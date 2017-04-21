describe("root exports", function () {
    it("should export APIs", function () {
        expect(adone.diff.Diff).to.exist;

        expect(adone.diff.chars).to.exist;
        expect(adone.diff.words).to.exist;
        expect(adone.diff.wordsWithSpace).to.exist;
        expect(adone.diff.lines).to.exist;
        expect(adone.diff.trimmedLines).to.exist;
        expect(adone.diff.sentences).to.exist;

        expect(adone.diff.css).to.exist;
        expect(adone.diff.objects).to.exist;

        expect(adone.diff.arrays).to.exist;

        expect(adone.diff.createStructuredPatch).to.exist;
        expect(adone.diff.createTwoFilesPatch).to.exist;
        expect(adone.diff.createPatch).to.exist;
        expect(adone.diff.applyPatch).to.exist;
        expect(adone.diff.applyPatches).to.exist;
        expect(adone.diff.parsePatch).to.exist;
        expect(adone.diff.mergePatches).to.exist;
        expect(adone.diff.convertChangesToDMP).to.exist;
        expect(adone.diff.convertChangesToXML).to.exist;
        expect(adone.diff.canonicalizeObject).to.exist;
    });
});
