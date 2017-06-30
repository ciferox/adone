describe("diff", () => {
    const { diff: { _: { wordDiff }, words, wordsWithSpace, util: { convertChangesToXML } } } = adone;

    describe("words", () => {
        it("should diff whitespace", () => {
            const diffResult = words("New Value", "New  ValueMoreData");
            expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins>");
        });

        it("should diff multiple whitespace values", () => {
            const diffResult = words("New Value  ", "New  ValueMoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins> ");
        });

        // Diff on word boundary
        it("should diff on word boundaries", () => {
            let diffResult = words("New :Value:Test", "New  ValueMoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  <del>:Value:Test</del><ins>ValueMoreData </ins>");

            diffResult = words("New Value:Test", "New  Value:MoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value:<del>Test</del><ins>MoreData </ins>");

            diffResult = words("New Value-Test", "New  Value:MoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value<del>-Test</del><ins>:MoreData </ins>");

            diffResult = words("New Value", "New  Value:MoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value<ins>:MoreData </ins>");
        });

        // Diff without changes
        it("should handle identity", () => {
            const diffResult = words("New Value", "New Value");
            expect(convertChangesToXML(diffResult)).to.equal("New Value");
        });
        it("should handle empty", () => {
            const diffResult = words("", "");
            expect(convertChangesToXML(diffResult)).to.equal("");
        });
        it("should diff has identical content", () => {
            const diffResult = words("New Value", "New  Value");
            expect(convertChangesToXML(diffResult)).to.equal("New  Value");
        });

        // Empty diffs
        it("should diff empty new content", () => {
            const diffResult = words("New Value", "");
            expect(diffResult.length).to.equal(1);
            expect(convertChangesToXML(diffResult)).to.equal("<del>New Value</del>");
        });
        it("should diff empty old content", () => {
            const diffResult = words("", "New Value");
            expect(convertChangesToXML(diffResult)).to.equal("<ins>New Value</ins>");
        });

        // With without anchor (the Heckel algorithm error case)
        it("should diff when there is no anchor value", () => {
            const diffResult = words("New Value New Value", "Value Value New New");
            expect(convertChangesToXML(diffResult)).to.equal("<del>New</del><ins>Value</ins> Value New <del>Value</del><ins>New</ins>");
        });

        it("should token unicode characters safely", () => {
            expect(wordDiff.removeEmpty(wordDiff.tokenize("jurídica"))).to.eql(["jurídica"]);
            expect(wordDiff.removeEmpty(wordDiff.tokenize("wir üben"))).to.eql(["wir", " ", "üben"]);
        });

        it("should include count with identity cases", () => {
            expect(words("foo", "foo")).to.eql([{ value: "foo", count: 1 }]);
            expect(words("foo bar", "foo bar")).to.eql([{ value: "foo bar", count: 3 }]);
        });
        it("should include count with empty cases", () => {
            expect(words("foo", "")).to.eql([{ value: "foo", count: 1, added: undefined, removed: true }]);
            expect(words("foo bar", "")).to.eql([{ value: "foo bar", count: 3, added: undefined, removed: true }]);

            expect(words("", "foo")).to.eql([{ value: "foo", count: 1, added: true, removed: undefined }]);
            expect(words("", "foo bar")).to.eql([{ value: "foo bar", count: 3, added: true, removed: undefined }]);
        });

        it("should ignore whitespace", () => {
            expect(words("hase igel fuchs", "hase igel fuchs")).to.eql([{ count: 5, value: "hase igel fuchs" }]);
            expect(words("hase igel fuchs", "hase igel fuchs\n")).to.eql([{ count: 5, value: "hase igel fuchs\n" }]);
            expect(words("hase igel fuchs\n", "hase igel fuchs")).to.eql([{ count: 5, value: "hase igel fuchs\n" }]);
            expect(words("hase igel fuchs", "hase igel\nfuchs")).to.eql([{ count: 5, value: "hase igel\nfuchs" }]);
            expect(words("hase igel\nfuchs", "hase igel fuchs")).to.eql([{ count: 5, value: "hase igel fuchs" }]);
        });

        it("should diff whitespace with flag", () => {
            const diffResult = words("New Value", "New  ValueMoreData", { ignoreWhitespace: false });
            expect(convertChangesToXML(diffResult)).to.equal("New<del> Value</del><ins>  ValueMoreData</ins>");
        });

        it("should diff with only whitespace", () => {
            let diffResult = words("", " ");
            expect(convertChangesToXML(diffResult)).to.equal("<ins> </ins>");

            diffResult = words(" ", "");
            expect(convertChangesToXML(diffResult)).to.equal("<del> </del>");
        });
    });

    describe("words - async", () => {
        it("should diff whitespace", (done) => {
            words("New Value", "New  ValueMoreData", (err, diffResult) => {
                expect(err).to.be.null;
                expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins>");
                done();
            });
        });

        it("should diff multiple whitespace values", (done) => {
            words("New Value  ", "New  ValueMoreData ", (err, diffResult) => {
                expect(err).to.be.null;
                expect(convertChangesToXML(diffResult)).to.equal("New  <del>Value</del><ins>ValueMoreData</ins> ");
                done();
            });
        });

        // Diff on word boundary
        it("should diff on word boundaries", (done) => {
            words("New :Value:Test", "New  ValueMoreData ", (err, diffResult) => {
                expect(err).to.be.null;
                expect(convertChangesToXML(diffResult)).to.equal("New  <del>:Value:Test</del><ins>ValueMoreData </ins>");
                done();
            });
        });

        // Diff without changes
        it("should handle identity", (done) => {
            words("New Value", "New Value", (err, diffResult) => {
                expect(err).to.be.null;
                expect(convertChangesToXML(diffResult)).to.equal("New Value");
                done();
            });
        });
        it("should handle empty", (done) => {
            words("", "", (err, diffResult) => {
                expect(err).to.be.null;
                expect(convertChangesToXML(diffResult)).to.equal("");
                done();
            });
        });
        it("should diff has identical content", (done) => {
            words("New Value", "New  Value", (err, diffResult) => {
                expect(err).to.be.null;
                expect(convertChangesToXML(diffResult)).to.equal("New  Value");
                done();
            });
        });

        // Empty diffs
        it("should diff empty new content", (done) => {
            words("New Value", "", (err, diffResult) => {
                expect(diffResult.length).to.equal(1);
                expect(convertChangesToXML(diffResult)).to.equal("<del>New Value</del>");
                done();
            });
        });
        it("should diff empty old content", (done) => {
            words("", "New Value", (err, diffResult) => {
                expect(convertChangesToXML(diffResult)).to.equal("<ins>New Value</ins>");
                done();
            });
        });

        // With without anchor (the Heckel algorithm error case)
        it("should diff when there is no anchor value", (done) => {
            words("New Value New Value", "Value Value New New", (err, diffResult) => {
                expect(convertChangesToXML(diffResult)).to.equal("<del>New</del><ins>Value</ins> Value New <del>Value</del><ins>New</ins>");
                done();
            });
        });
    });

    describe("wordsWithSpace", () => {
        it("should diff whitespace", () => {
            const diffResult = wordsWithSpace("New Value", "New  ValueMoreData");
            expect(convertChangesToXML(diffResult)).to.equal("New<del> Value</del><ins>  ValueMoreData</ins>");
        });

        it("should diff multiple whitespace values", () => {
            const diffResult = wordsWithSpace("New Value  ", "New  ValueMoreData ");
            expect(convertChangesToXML(diffResult)).to.equal("New<ins>  ValueMoreData</ins> <del>Value  </del>");
        });

        it("should perform async operations", (done) => {
            wordsWithSpace("New Value  ", "New  ValueMoreData ", (err, diffResult) => {
                expect(convertChangesToXML(diffResult)).to.equal("New<ins>  ValueMoreData</ins> <del>Value  </del>");
                done();
            });
        });

        describe("case insensitivity", () => {
            it("is considered when there's a difference", () => {
                const diffResult = wordsWithSpace("new value", "New  ValueMoreData", { ignoreCase: true });
                expect(convertChangesToXML(diffResult)).to.equal("New<del> value</del><ins>  ValueMoreData</ins>");
            });

            it("is considered when there's no difference", () => {
                const diffResult = wordsWithSpace("new value", "New Value", { ignoreCase: true });
                expect(convertChangesToXML(diffResult)).to.equal("New Value");
            });
        });
    });
});
