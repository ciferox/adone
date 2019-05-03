import { diffLines, diffTrimmedLines } from "../../../../lib/glosses/diff/diff/line";
import { convertChangesToXML } from "../../../../lib/glosses/diff/convert/xml";

describe("diff/line", () => {
    // Line Diff
    describe("#diffLines", () => {
        it("should diff lines", () => {
            const diffResult = diffLines(
                "line\nold value\nline",
                "line\nnew value\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>old value\n</del><ins>new value\n</ins>line");
        });
        it("should the same lines in diff", () => {
            const diffResult = diffLines(
                "line\nvalue\nline",
                "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should handle leading and trailing whitespace", () => {
            const diffResult = diffLines(
                "line\nvalue \nline",
                "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>value \n</del><ins>value\n</ins>line");
        });

        it("should handle windows line endings", () => {
            const diffResult = diffLines(
                "line\r\nold value \r\nline",
                "line\r\nnew value\r\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\r\n<del>old value \r\n</del><ins>new value\r\n</ins>line");
        });

        it("should handle empty lines", () => {
            const diffResult = diffLines(
                "line\n\nold value \n\nline",
                "line\n\nnew value\n\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n\n<del>old value \n</del><ins>new value\n</ins>\nline");
        });

        it("should handle empty input", () => {
            const diffResult = diffLines(
                "line\n\nold value \n\nline",
                "");
            expect(convertChangesToXML(diffResult)).to.equal("<del>line\n\nold value \n\nline</del>");
        });
    });

    // Trimmed Line Diff
    describe("#TrimmedLineDiff", () => {
        it("should diff lines", () => {
            const diffResult = diffTrimmedLines(
                "line\nold value\nline",
                "line\nnew value\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>old value\n</del><ins>new value\n</ins>line");
        });
        it("should the same lines in diff", () => {
            const diffResult = diffTrimmedLines(
                "line\nvalue\nline",
                "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should ignore leading and trailing whitespace", () => {
            const diffResult = diffTrimmedLines(
                "line\nvalue \nline",
                "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should handle windows line endings", () => {
            const diffResult = diffTrimmedLines(
                "line\r\nold value \r\nline",
                "line\r\nnew value\r\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\r\n<del>old value\r\n</del><ins>new value\r\n</ins>line");
        });
    });

    describe("#diffLinesNL", () => {
        expect(diffLines("restaurant", "restaurant\n", { newlineIsToken: true })).to.eql([
            { value: "restaurant", count: 1 },
            { value: "\n", count: 1, added: true, removed: undefined }
        ]);
        expect(diffLines("restaurant", "restaurant\nhello", { newlineIsToken: true })).to.eql([
            { value: "restaurant", count: 1 },
            { value: "\nhello", count: 2, added: true, removed: undefined }
        ]);
    });
});
