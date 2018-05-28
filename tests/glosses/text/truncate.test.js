const {
    text: { truncate }
} = adone;

describe("truncate", () => {
    it("all", () => {
        assert.strictEqual(truncate("unicorn", 4), "uni…");
        assert.strictEqual(truncate("unicorn", 4, { position: "end" }), "uni…");
        assert.strictEqual(truncate("unicorn", 1), "…");
        assert.strictEqual(truncate("a", 1), "a");
        assert.strictEqual(truncate("ab", 2), "ab");
        assert.strictEqual(truncate("unicorn", 0), "");
        assert.strictEqual(truncate("unicorn", -4), "");
        assert.strictEqual(truncate("unicorn", 20), "unicorn");
        assert.strictEqual(truncate("unicorn", 7), "unicorn");
        assert.strictEqual(truncate("unicorn", 6), "unico…");
        assert.strictEqual(truncate("\u001B[31municorn\u001B[39m", 7), "\u001B[31municorn\u001B[39m");
        assert.strictEqual(truncate("\u001B[31municorn\u001B[39m", 1), "…");
        assert.strictEqual(truncate("\u001B[31municorn\u001B[39m", 4), "\u001B[31muni\u001B[39m…");
        assert.strictEqual(truncate("a\uD83C\uDE00b\uD83C\uDE00c", 5), "a\uD83C\uDE00b\uD83C\uDE00…", "surrogate pairs");
        assert.strictEqual(truncate("안녕하세요", 3), "안녕…", "wide char");
        assert.strictEqual(truncate("안녕하세요", 3, { term: true }), "안…", "wide char");
        assert.strictEqual(truncate("日本語テスト", 12), "日本語テスト");
        assert.strictEqual(truncate("unicorn", 5, { position: "start" }), "…corn");
        assert.strictEqual(truncate("unicorn", 6, { position: "start" }), "…icorn");
        assert.strictEqual(truncate("unicorn", 5, { position: "middle" }), "un…rn");
        assert.strictEqual(truncate("unicorns", 6, { position: "middle" }), "uni…ns");
    });

    it("custom ellipsis at the start", () => {
        assert.strictEqual(truncate("unicorn", 5, {
            position: "start",
            ellipsis: "..."
        }), "...rn");
    });

    it("custom ellipsis at the end", () => {
        assert.strictEqual(truncate("unicorn", 5, {
            ellipsis: "..."
        }), "un...");
    });

    it("custom ellipsis at the middle", () => {
        assert.strictEqual(truncate("unicorn", 5, {
            position: "middle",
            ellipsis: "..."
        }), "u...n");
    });
});
