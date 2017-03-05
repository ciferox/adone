"use string";

const { chars, convertChangesToXML } = adone.util.diff;

describe("diff/character", function () {
    describe("#chars", function () {
        it("Should diff chars", function () {
            const diffResult = chars("New Value.", "New ValueMoreData.");
            expect(convertChangesToXML(diffResult)).to.equal("New Value<ins>MoreData</ins>.");
        });
    });
});