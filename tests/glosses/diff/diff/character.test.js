import { diffChars } from "../../../../lib/glosses/diff/diff/character";
import { convertChangesToXML } from "../../../../lib/glosses/diff/convert/xml";

describe("diff/character", () => {
    describe("#diffChars", () => {
        it("Should diff chars", () => {
            const diffResult = diffChars("New Value.", "New ValueMoreData.");
            expect(convertChangesToXML(diffResult)).to.equal("New Value<ins>MoreData</ins>.");
        });

        describe("case insensitivity", () => {
            it("is considered when there's no difference", () => {
                const diffResult = diffChars("New Value.", "New value.", { ignoreCase: true });
                expect(convertChangesToXML(diffResult)).to.equal("New value.");
            });

            it("is considered when there's a difference", () => {
                const diffResult = diffChars("New Values.", "New value.", { ignoreCase: true });
                expect(convertChangesToXML(diffResult)).to.equal("New value<del>s</del>.");
            });
        });
    });
});
