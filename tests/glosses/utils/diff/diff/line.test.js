"use string";

const { lines, trimmedLines, convertChangesToXML } = adone.util.diff;

describe("diff/line", function () {
    // Line Diff
    describe("#lines", function () {
        it("should diff lines", function () {
            const diffResult = lines("line\nold value\nline", "line\nnew value\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>old value\n</del><ins>new value\n</ins>line");
        });
        it("should the same lines in diff", function () {
            const diffResult = lines("line\nvalue\nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should handle leading and trailing whitespace", function () {
            const diffResult = lines("line\nvalue \nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>value \n</del><ins>value\n</ins>line");
        });

        it("should handle windows line endings", function () {
            const diffResult = lines("line\r\nold value \r\nline", "line\r\nnew value\r\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\r\n<del>old value \r\n</del><ins>new value\r\n</ins>line");
        });

        it("should handle empty lines", function () {
            const diffResult = lines("line\n\nold value \n\nline", "line\n\nnew value\n\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n\n<del>old value \n</del><ins>new value\n</ins>\nline");
        });

        it("should handle empty input", function () {
            const diffResult = lines("line\n\nold value \n\nline", "");
            expect(convertChangesToXML(diffResult)).to.equal("<del>line\n\nold value \n\nline</del>");
        });
    });

    // Trimmed Line Diff
    describe("#TrimmedLineDiff", function () {
        it("should diff lines", function () {
            const diffResult = trimmedLines("line\nold value\nline", "line\nnew value\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>old value\n</del><ins>new value\n</ins>line");
        });
        it("should the same lines in diff", function () {
            const diffResult = trimmedLines("line\nvalue\nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should ignore leading and trailing whitespace", function () {
            const diffResult = trimmedLines("line\nvalue \nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should handle windows line endings", function () {
            const diffResult = trimmedLines("line\r\nold value \r\nline", "line\r\nnew value\r\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\r\n<del>old value\r\n</del><ins>new value\r\n</ins>line");
        });
    });

    describe("#linesNL", function () {
        expect(lines("restaurant", "restaurant\n", { newlineIsToken: true })).to.eql([{ value: "restaurant", count: 1 }, { value: "\n", count: 1, added: true, removed: undefined }]);
        expect(lines("restaurant", "restaurant\nhello", { newlineIsToken: true })).to.eql([{ value: "restaurant", count: 1 }, { value: "\nhello", count: 2, added: true, removed: undefined }]);
    });
});