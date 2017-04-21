"use string";

const { convertChangesToDMP, words } = adone.diff;

describe("convertToDMP", function () {
    it("should output diff-match-patch format", function () {
        const diffResult = words("New Value  ", "New  ValueMoreData ");

        expect(convertChangesToDMP(diffResult)).to.eql([[0, "New  "], [-1, "Value"], [1, "ValueMoreData"], [0, " "]]);
    });
});