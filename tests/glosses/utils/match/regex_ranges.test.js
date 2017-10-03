import mm from "./support/match";

describe("util", "match", "ranges", () => {
    it("should support valid regex ranges", () => {
        const fixtures = ["a.a", "a.b", "a.a.a", "c.a", "d.a.d", "a.bb", "a.ccc"];
        mm(fixtures, "[a-b].[a-b]", ["a.a", "a.b"]);
        mm(fixtures, "[a-d].[a-b]", ["a.a", "a.b", "c.a"]);
        mm(fixtures, "[a-d]*.[a-b]", ["a.a", "a.b", "a.a.a", "c.a"]);
        mm(fixtures, "[a-d]*.[a-b]", ["a.a", "a.b", "c.a"], { bash: false });
    });

    it("should support valid regex ranges with glob negation patterns", () => {
        const fixtures = ["a.a", "a.b", "a.a.a", "c.a", "d.a.d", "a.bb", "a.ccc"];
        mm(fixtures, "!*.[a-b]", ["a.bb", "a.ccc", "d.a.d"]);
        mm(fixtures, "!*.[a-b]*", ["a.ccc"]);
        mm(fixtures, "!*.[a-b]*", ["a.ccc", "d.a.d"], { bash: false });
        mm(fixtures, "![a-b].[a-b]", ["a.a.a", "a.bb", "a.ccc", "c.a", "d.a.d"]);
        mm(fixtures, "![a-b]+.[a-b]+", ["a.a.a", "a.ccc", "c.a", "d.a.d"]);
    });

    it("should support valid regex ranges with negation patterns", () => {
        const fixtures = ["a.a", "a.b", "a.a.a", "c.a", "d.a.d", "a.bb", "a.ccc"];
        mm(fixtures, "*.[^a-b]", ["d.a.d"]);
        mm(fixtures, "a.[^a-b]*", ["a.ccc"]);
    });
});
