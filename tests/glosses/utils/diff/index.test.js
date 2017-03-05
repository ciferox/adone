describe("root exports", function () {
    it("should export APIs", function () {
        expect(adone.util.diff.Diff).to.exist;

        expect(adone.util.diff.chars).to.exist;
        expect(adone.util.diff.words).to.exist;
        expect(adone.util.diff.wordsWithSpace).to.exist;
        expect(adone.util.diff.lines).to.exist;
        expect(adone.util.diff.trimmedLines).to.exist;
        expect(adone.util.diff.sentences).to.exist;

        expect(adone.util.diff.css).to.exist;
        expect(adone.util.diff.objects).to.exist;

        expect(adone.util.diff.arrays).to.exist;

        expect(adone.util.diff.createStructuredPatch).to.exist;
        expect(adone.util.diff.createTwoFilesPatch).to.exist;
        expect(adone.util.diff.createPatch).to.exist;
        expect(adone.util.diff.applyPatch).to.exist;
        expect(adone.util.diff.applyPatches).to.exist;
        expect(adone.util.diff.parsePatch).to.exist;
        expect(adone.util.diff.mergePatches).to.exist;
        expect(adone.util.diff.convertChangesToDMP).to.exist;
        expect(adone.util.diff.convertChangesToXML).to.exist;
        expect(adone.util.diff.canonicalizeObject).to.exist;
    });
});
