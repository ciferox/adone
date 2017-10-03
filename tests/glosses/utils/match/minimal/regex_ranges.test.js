import nm from "./support/match";

describe("util", "match", "minimal", "ranges", () => {
    it("should support valid regex ranges", () => {
        const fixtures = ["a.a", "a.b", "a.a.a", "c.a", "d.a.d", "a.bb", "a.ccc"];
        nm(fixtures, "[a-b].[a-b]", ["a.a", "a.b"]);
        nm(fixtures, "[a-d].[a-b]", ["a.a", "a.b", "c.a"]);
        nm(fixtures, "[a-d]*.[a-b]", ["a.a", "a.b", "a.a.a", "c.a"]);
        nm(fixtures, "[a-d]*.[a-b]", ["a.a", "a.b", "c.a"], { bash: false });
    });

    it("should support valid regex ranges with glob negation patterns", () => {
        const fixtures = ["a.a", "a.b", "a.a.a", "c.a", "d.a.d", "a.bb", "a.ccc"];
        nm(fixtures, "!*.[a-b]", ["a.bb", "a.ccc", "d.a.d"]);
        nm(fixtures, "!*.[a-b]*", ["a.ccc"]);
        nm(fixtures, "!*.[a-b]*", ["a.ccc", "d.a.d"], { bash: false });
        nm(fixtures, "![a-b].[a-b]", ["a.a.a", "a.bb", "a.ccc", "c.a", "d.a.d"]);
        nm(fixtures, "![a-b]+.[a-b]+", ["a.a.a", "a.ccc", "c.a", "d.a.d"]);
    });

    it("should support valid regex ranges with negation patterns", () => {
        const fixtures = ["a.a", "a.b", "a.a.a", "c.a", "d.a.d", "a.bb", "a.ccc"];
        nm(fixtures, "*.[^a-b]", ["d.a.d"]);
        nm(fixtures, "a.[^a-b]*", ["a.ccc"]);
    });
});
