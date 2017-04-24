describe("glosses", "diff", () => {
    const { diff: { lines, trimmedLines, util: { convertChangesToXML } } } = adone;

    describe("lines", () => {
        it("should diff lines", () => {
            const diffResult = lines("line\nold value\nline", "line\nnew value\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>old value\n</del><ins>new value\n</ins>line");
        });
        it("should the same lines in diff", () => {
            const diffResult = lines("line\nvalue\nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should handle leading and trailing whitespace", () => {
            const diffResult = lines("line\nvalue \nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>value \n</del><ins>value\n</ins>line");
        });

        it("should handle windows line endings", () => {
            const diffResult = lines("line\r\nold value \r\nline", "line\r\nnew value\r\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\r\n<del>old value \r\n</del><ins>new value\r\n</ins>line");
        });

        it("should handle empty lines", () => {
            const diffResult = lines("line\n\nold value \n\nline", "line\n\nnew value\n\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n\n<del>old value \n</del><ins>new value\n</ins>\nline");
        });

        it("should handle empty input", () => {
            const diffResult = lines("line\n\nold value \n\nline", "");
            expect(convertChangesToXML(diffResult)).to.equal("<del>line\n\nold value \n\nline</del>");
        });
    });

    describe("trimmedLineDiff", () => {
        it("should diff lines", () => {
            const diffResult = trimmedLines("line\nold value\nline", "line\nnew value\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\n<del>old value\n</del><ins>new value\n</ins>line");
        });

        it("should the same lines in diff", () => {
            const diffResult = trimmedLines("line\nvalue\nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should ignore leading and trailing whitespace", () => {
            const diffResult = trimmedLines("line\nvalue \nline", "line\nvalue\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\nvalue\nline");
        });

        it("should handle windows line endings", () => {
            const diffResult = trimmedLines("line\r\nold value \r\nline", "line\r\nnew value\r\nline");
            expect(convertChangesToXML(diffResult)).to.equal("line\r\n<del>old value\r\n</del><ins>new value\r\n</ins>line");
        });
    });

    describe("linesNL", () => {
        expect(lines("restaurant", "restaurant\n", { newlineIsToken: true })).to.eql([{ value: "restaurant", count: 1 }, { value: "\n", count: 1, added: true, removed: undefined }]);
        expect(lines("restaurant", "restaurant\nhello", { newlineIsToken: true })).to.eql([{ value: "restaurant", count: 1 }, { value: "\nhello", count: 2, added: true, removed: undefined }]);
    });
});
