const { Parser } = adone.getPrivate(adone.util.Snapdragon);
let parser;

describe("util", "Snapdragon", "parser", () => {
    beforeEach(() => {
        parser = new Parser();
    });

    describe("errors", () => {
        it("should throw an error when invalid args are passed to parse", (cb) => {
            const parser = new Parser();
            try {
                parser.parse();
                cb(new Error("expected an error"));
            } catch (err) {
                assert(err);
                assert.equal(err.message, "expected a string");
                cb();
            }
        });
    });

    describe("bos", () => {
        it("should set a beginning-of-string node", () => {
            const parser = new Parser();
            parser.set("all", function () {
                const pos = this.position();
                const m = this.match(/^.*/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "all",
                    val: m[0]
                });
            });

            const ast = parser.parse("a/b");
            assert.equal(ast.nodes[0].type, "bos");
        });
    });

    describe("eos", () => {
        it("should set an end-of-string node", () => {
            const parser = new Parser();
            parser.set("all", function () {
                const pos = this.position();
                const m = this.match(/^.*/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "all",
                    val: m[0]
                });
            });

            const ast = parser.parse("a/b");
            assert.equal(ast.nodes[ast.nodes.length - 1].type, "eos");
        });
    });

    describe(".set():", () => {
        it("should register middleware", () => {
            parser.set("all", function () {
                const pos = this.position();
                const m = this.match(/^.*/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "all",
                    val: m[0]
                });
            });

            parser.parse("a/b");
            assert(parser.parsers.hasOwnProperty("all"));
        });

        it("should use middleware to parse", () => {
            parser.set("all", function () {
                const pos = this.position();
                const m = this.match(/^.*/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "all",
                    val: m[0]
                });
            });

            parser.parse("a/b");
            assert.equal(parser.parsed, "a/b");
            assert.equal(parser.input, "");
        });

        it("should create ast node:", () => {
            parser.set("all", function () {
                const pos = this.position();
                const m = this.match(/^.*/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "all",
                    val: m[0]
                });
            });

            parser.parse("a/b");
            assert.equal(parser.ast.nodes.length, 3);
        });

        it("should be chainable:", () => {
            parser
                .set("text", function () {
                    const pos = this.position();
                    const m = this.match(/^\w+/);
                    if (!m) {
                        return;
                    }
                    return pos({
                        type: "text",
                        val: m[0]
                    });
                })
                .set("slash", function () {
                    const pos = this.position();
                    const m = this.match(/^\//);
                    if (!m) {
                        return;
                    }
                    return pos({
                        type: "slash",
                        val: m[0]
                    });
                });

            parser.parse("a/b");
            assert.equal(parser.ast.nodes.length, 5);
        });
    });
});

describe("util", "Snapdragon", "ast", () => {
    beforeEach(() => {
        parser = new Parser();
        parser
            .set("text", function () {
                const pos = this.position();
                const m = this.match(/^\w+/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "text",
                    val: m[0]
                });
            })
            .set("slash", function () {
                const pos = this.position();
                const m = this.match(/^\//);
                if (!m) {
                    return;
                }
                return pos({
                    type: "slash",
                    val: m[0]
                });
            });
    });

    describe("orig:", () => {
        it("should add pattern to orig property", () => {
            parser.parse("a/b");
            assert.equal(parser.orig, "a/b");
        });
    });

    describe("recursion", () => {
        beforeEach(() => {
            parser.set("text", function () {
                const pos = this.position();
                const m = this.match(/^\w/);
                if (!m) {
                    return;
                }
                return pos({
                    val: m[0]
                });
            });

            parser.set("open", function () {
                const pos = this.position();
                const m = this.match(/^\{/);
                if (!m) {
                    return;
                }
                return pos({
                    val: m[0]
                });
            });

            parser.set("close", function () {
                const pos = this.position();
                const m = this.match(/^\}/);
                if (!m) {
                    return;
                }
                return pos({
                    val: m[0]
                });
            });

            parser.set("comma", function () {
                const pos = this.position();
                const m = this.match(/,/);
                if (!m) {
                    return;
                }
                return pos({
                    val: m[0]
                });
            });
        });

        it("should set original string on `orig`", () => {
            parser.parse("a{b,{c,d},e}f");
            assert.equal(parser.orig, "a{b,{c,d},e}f");
        });
    });
});
