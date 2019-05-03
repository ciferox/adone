import { convertChangesToDMP } from "../../../../lib/glosses/diff/convert/dmp";
import { diffWords } from "../../../../lib/glosses/diff/diff/word";

describe("convertToDMP", () => {
    it("should output diff-match-patch format", () => {
        const diffResult = diffWords("New Value  ", "New  ValueMoreData ");

        expect(convertChangesToDMP(diffResult)).to.eql([[0, "New  "], [-1, "Value"], [1, "ValueMoreData"], [0, " "]]);
    });
});
