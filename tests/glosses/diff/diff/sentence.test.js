import { diffSentences } from "../../../../lib/glosses/diff/diff/sentence";
import { convertChangesToXML } from "../../../../lib/glosses/diff/convert/xml";

describe("diff/sentence", () => {
    describe("#diffSentences", () => {
        it("Should diff Sentences", () => {
            const diffResult = diffSentences("New Value.", "New ValueMoreData.");
            expect(convertChangesToXML(diffResult)).to.equal("<del>New Value.</del><ins>New ValueMoreData.</ins>");
        });

        it("should diff only the last sentence", () => {
            const diffResult = diffSentences("Here im. Rock you like old man.", "Here im. Rock you like hurricane.");
            expect(convertChangesToXML(diffResult)).to.equal("Here im. <del>Rock you like old man.</del><ins>Rock you like hurricane.</ins>");
        });
    });
});
