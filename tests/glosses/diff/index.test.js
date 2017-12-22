describe("diff", () => {
    it("should export APIs", () => {
        expect(adone.diff.chars).to.exist();
        expect(adone.diff.words).to.exist();
        expect(adone.diff.wordsWithSpace).to.exist();
        expect(adone.diff.lines).to.exist();
        expect(adone.diff.trimmedLines).to.exist();
        expect(adone.diff.sentences).to.exist();

        expect(adone.diff.css).to.exist();
        expect(adone.diff.json).to.exist();

        expect(adone.diff.arrays).to.exist();

        expect(adone.diff.util.structuredPatch).to.exist();
        expect(adone.diff.util.createTwoFilesPatch).to.exist();
        expect(adone.diff.util.createPatch).to.exist();
        expect(adone.diff.util.applyPatch).to.exist();
        expect(adone.diff.util.applyPatches).to.exist();
        expect(adone.diff.util.parsePatch).to.exist();
        expect(adone.diff.util.mergePatches).to.exist();
        expect(adone.diff.util.convertChangesToDMP).to.exist();
        expect(adone.diff.util.convertChangesToXML).to.exist();
        expect(adone.diff.util.canonicalizeObject).to.exist();
    });
});
