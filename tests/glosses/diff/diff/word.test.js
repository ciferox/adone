import { wordDiff, diffWords, diffWordsWithSpace } from "../../../../lib/glosses/diff/diff/word";
import { convertChangesToXML } from "../../../../lib/glosses/diff/convert/xml";

describe("WordDiff", () => {
    describe("#diffWords", () => {
        it("should diff whitespace", () => {
            const diffResult = diffWords("New Value", "New  ValueMoreData");
            expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins>");
        });

        it("should diff multiple whitespace values", () => {
            const diffResult = diffWords("New Value  ", "New  ValueMoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins> ");
        });

        // Diff on word boundary
        it("should diff on word boundaries", () => {
            let diffResult = diffWords("New :Value:Test", "New  ValueMoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  <del>:Value:Test</del><ins>ValueMoreData </ins>");

            diffResult = diffWords("New Value:Test", "New  Value:MoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value:<del>Test</del><ins>MoreData </ins>");

            diffResult = diffWords("New Value-Test", "New  Value:MoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value<del>-Test</del><ins>:MoreData </ins>");

            diffResult = diffWords("New Value", "New  Value:MoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value<ins>:MoreData </ins>");
        });

        // Diff without changes
        it("should handle identity", () => {
            const diffResult = diffWords("New Value", "New Value");
            expect(convertChangesToXML(diffResult)).to.equal("New Value");
        });
        it("should handle empty", () => {
            const diffResult = diffWords("", "");
            expect(convertChangesToXML(diffResult)).to.equal("");
        });
        it("should diff has identical content", () => {
            const diffResult = diffWords("New Value", "New  Value");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value");
        });

        // Empty diffs
        it("should diff empty new content", () => {
            const diffResult = diffWords("New Value", "");
            expect(diffResult.length).to.equal(1);
            expect(convertChangesToXML(diffResult)).to.equal("<del>New Value</del>");
        });
        it("should diff empty old content", () => {
            const diffResult = diffWords("", "New Value");
            expect(convertChangesToXML(diffResult)).to.equal("<ins>New Value</ins>");
        });

        // With without anchor (the Heckel algorithm error case)
        it("should diff when there is no anchor value", () => {
            const diffResult = diffWords("New Value New Value", "Value Value New New");
            expect(convertChangesToXML(diffResult)).to.equal("<del>New</del><ins>Value</ins> Value New <del>Value</del><ins>New</ins>");
        });

        it("should token unicode characters safely", () => {
            expect(wordDiff.removeEmpty(wordDiff.tokenize("jurídica"))).to.eql(["jurídica"]);
            expect(wordDiff.removeEmpty(wordDiff.tokenize("wir üben"))).to.eql(["wir", " ", "üben"]);
        });

        it("should include count with identity cases", () => {
            expect(diffWords("foo", "foo")).to.eql([{ value: "foo", count: 1 }]);
            expect(diffWords("foo bar", "foo bar")).to.eql([{ value: "foo bar", count: 3 }]);
        });
        it("should include count with empty cases", () => {
            expect(diffWords("foo", "")).to.eql([{ value: "foo", count: 1, added: undefined, removed: true }]);
            expect(diffWords("foo bar", "")).to.eql([{ value: "foo bar", count: 3, added: undefined, removed: true }]);

            expect(diffWords("", "foo")).to.eql([{ value: "foo", count: 1, added: true, removed: undefined }]);
            expect(diffWords("", "foo bar")).to.eql([{ value: "foo bar", count: 3, added: true, removed: undefined }]);
        });

        it("should ignore whitespace", () => {
            expect(diffWords("hase igel fuchs", "hase igel fuchs")).to.eql([{ count: 5, value: "hase igel fuchs" }]);
            expect(diffWords("hase igel fuchs", "hase igel fuchs\n")).to.eql([{ count: 5, value: "hase igel fuchs\n" }]);
            expect(diffWords("hase igel fuchs\n", "hase igel fuchs")).to.eql([{ count: 5, value: "hase igel fuchs\n" }]);
            expect(diffWords("hase igel fuchs", "hase igel\nfuchs")).to.eql([{ count: 5, value: "hase igel\nfuchs" }]);
            expect(diffWords("hase igel\nfuchs", "hase igel fuchs")).to.eql([{ count: 5, value: "hase igel fuchs" }]);
        });

        it("should diff whitespace with flag", () => {
            const diffResult = diffWords("New Value", "New  ValueMoreData", { ignoreWhitespace: false });
            expect(convertChangesToXML(diffResult)).to.equal("New<del> Value</del><ins>  ValueMoreData</ins>");
        });

        it("should diff with only whitespace", () => {
            let diffResult = diffWords("", " ");
            expect(convertChangesToXML(diffResult)).to.equal("<ins> </ins>");

            diffResult = diffWords(" ", "");
            expect(convertChangesToXML(diffResult)).to.equal("<del> </del>");
        });
    });

    describe("#diffWords - async", () => {
        it("should diff whitespace", (done) => {
            diffWords("New Value", "New  ValueMoreData", (err, diffResult) => {
                expect(err).to.be.undefined;
                expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins>");
                done();
            });
        });

        it("should diff multiple whitespace values", (done) => {
            diffWords("New Value  ", "New  ValueMoreData ", (err, diffResult) => {
                expect(err).to.be.undefined;
                expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins> ");
                done();
            });
        });

        // Diff on word boundary
        it("should diff on word boundaries", (done) => {
            diffWords("New :Value:Test", "New  ValueMoreData ", (err, diffResult) => {
                expect(err).to.be.undefined;
                expect(convertChangesToXML(diffResult)).to.equal("New  <del>:Value:Test</del><ins>ValueMoreData </ins>");
                done();
            });
        });

        // Diff without changes
        it("should handle identity", (done) => {
            diffWords("New Value", "New Value", (err, diffResult) => {
                expect(err).to.be.undefined;
                expect(convertChangesToXML(diffResult)).to.equal("New Value");
                done();
            });
        });
        it("should handle empty", (done) => {
            diffWords("", "", (err, diffResult) => {
                expect(err).to.be.undefined;
                expect(convertChangesToXML(diffResult)).to.equal("");
                done();
            });
        });
        it("should diff has identical content", (done) => {
            diffWords("New Value", "New  Value", (err, diffResult) => {
                expect(err).to.be.undefined;
                expect(convertChangesToXML(diffResult)).to.equal("New  Value");
                done();
            });
        });

        // Empty diffs
        it("should diff empty new content", (done) => {
            diffWords("New Value", "", (err, diffResult) => {
                expect(diffResult.length).to.equal(1);
                expect(convertChangesToXML(diffResult)).to.equal("<del>New Value</del>");
                done();
            });
        });
        it("should diff empty old content", (done) => {
            diffWords("", "New Value", (err, diffResult) => {
                expect(convertChangesToXML(diffResult)).to.equal("<ins>New Value</ins>");
                done();
            });
        });

        // With without anchor (the Heckel algorithm error case)
        it("should diff when there is no anchor value", (done) => {
            diffWords("New Value New Value", "Value Value New New", (err, diffResult) => {
                expect(convertChangesToXML(diffResult)).to.equal("<del>New</del><ins>Value</ins> Value New <del>Value</del><ins>New</ins>");
                done();
            });
        });
    });

    describe("#diffWordsWithSpace", () => {
        it("should diff whitespace", () => {
            const diffResult = diffWordsWithSpace("New Value", "New  ValueMoreData");
            expect(convertChangesToXML(diffResult)).to.equal("New<del> Value</del><ins>  ValueMoreData</ins>");
        });

        it("should diff multiple whitespace values", () => {
            const diffResult = diffWordsWithSpace("New Value  ", "New  ValueMoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New<ins>  ValueMoreData</ins> <del>Value  </del>");
        });

        it("should inserts values in parenthesis", () => {
            const diffResult = diffWordsWithSpace("()", "(word)");
            expect(convertChangesToXML(diffResult)).to.equal("(<ins>word</ins>)");
        });

        it("should inserts values in brackets", () => {
            const diffResult = diffWordsWithSpace("[]", "[word]");
            expect(convertChangesToXML(diffResult)).to.equal("[<ins>word</ins>]");
        });

        it("should inserts values in curly braces", () => {
            const diffResult = diffWordsWithSpace("{}", "{word}");
            expect(convertChangesToXML(diffResult)).to.equal("{<ins>word</ins>}");
        });

        it("should inserts values in quotes", () => {
            const diffResult = diffWordsWithSpace("''", "'word'");
            expect(convertChangesToXML(diffResult)).to.equal("'<ins>word</ins>'");
        });

        it("should inserts values in double quotes", () => {
            const diffResult = diffWordsWithSpace('""', '"word"');
            expect(convertChangesToXML(diffResult)).to.equal("&quot;<ins>word</ins>&quot;");
        });

        it("should perform async operations", (done) => {
            diffWordsWithSpace("New Value  ", "New  ValueMoreData ", (err, diffResult) => {
                expect(convertChangesToXML(diffResult)).to.equal("New<ins>  ValueMoreData</ins> <del>Value  </del>");
                done();
            });
        });

        describe("case insensitivity", () => {
            it("is considered when there's a difference", () => {
                const diffResult = diffWordsWithSpace("new value", "New  ValueMoreData", { ignoreCase: true });
                expect(convertChangesToXML(diffResult)).to.equal("New<del> value</del><ins>  ValueMoreData</ins>");
            });

            it("is considered when there's no difference", () => {
                const diffResult = diffWordsWithSpace("new value", "New Value", { ignoreCase: true });
                expect(convertChangesToXML(diffResult)).to.equal("New Value");
            });
        });
    });
});
