const {
    js: { highlight },
    text: { stripAnsi }
} = adone;

describe("js", "highlight", () => {
    describe("highlight", () => {
        describe("when colors are supported", () => {
            it("highlights code", () => {
                const code = "console.log('hi')";
                const result = highlight(code);
                const stripped = stripAnsi(result);
                assert.ok(result.length > stripped.length);
                assert.equal(stripped, code);
            });
        });
    });
});
