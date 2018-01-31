describe("shani", "util", "diff", () => {
    const {
        shani: {
            util: {
                diff: {
                    getDiff
                }
            }
        }
    } = adone;

    const noColor = (s) => adone.text.stripAnsi(s);
    const getDiffNoColor = (...args) => noColor(getDiff(...args));
    const join = (arr) => arr.join("\n");

    describe("arrays", () => {
        it("should mark missing elements with +", () => {
            const diff = getDiffNoColor([1, 2, 3], [1, 2, 3, 4]);
            assert.equal(diff, join([
                "[",
                "    1,",
                "    2,",
                "    3,",
                "  + 4",
                "]"
            ]));
        });

        it("should mark extra elements with -", () => {
            const diff = getDiffNoColor([1, 2, 3, 4], [1, 2, 3]);
            assert.equal(diff, join([
                "[",
                "    1,",
                "    2,",
                "    3,",
                "  - 4",
                "]"
            ]));
        });

        it("should correctly handle missing + extra elements", () => {
            const diff = getDiffNoColor([1, 3, 2, 4, 6, 5], [1, 2, 3, 4, 5, 5]);
            assert.equal(diff, join([
                "[",
                "    1,",
                "  + 2,",
                "    3,",
                "  - 2,",
                "    4,",
                "  - 6,",
                "    5,",
                "  + 5",
                "]"
            ]));
        });

        it("should not mark it they are same", () => {
            const diff = getDiffNoColor([1, 2, 3], [1, 2, 3]);
            assert.equal(diff, join([
                "[",
                "    1,",
                "    2,",
                "    3",
                "]"
            ]));
        });

        it("should not use newlines for an empty array", () => {
            const diff = getDiffNoColor([], []);
            assert.equal(diff, "[]");
        });
    });
});
