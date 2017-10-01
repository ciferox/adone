const { Snapdragon } = adone.util;
let snapdragon;

describe("util", "Snapdragon", "parser", () => {
    beforeEach(() => {
        snapdragon = new Snapdragon();
    });

    describe("errors", () => {
        it("should throw an error when invalid args are passed to parse", (cb) => {
            try {
                snapdragon.parse();
                cb(new Error("expected an error"));
            } catch (err) {
                assert(err);
                assert.equal(err.message, "expected a string");
                cb();
            }
        });
    });

    describe(".set():", () => {
        it("should register middleware", () => {
            snapdragon.parser.set("all", function () {
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

            snapdragon.parse("a/b");
            assert(snapdragon.parsers.hasOwnProperty("all"));
        });

        it("should use middleware to parse", () => {
            snapdragon.parser.set("all", function () {
                const pos = this.position();
                const m = this.match(/^.*/);
                return pos({
                    type: "all",
                    val: m[0]
                });
            });

            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.parsed, "a/b");
            assert.equal(snapdragon.parser.input, "");
        });

        it("should create ast node:", () => {
            snapdragon.parser.set("all", function () {
                const pos = this.position();
                const m = this.match(/^.*/);
                return pos({
                    type: "all",
                    val: m[0]
                });
            });

            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.ast.nodes.length, 3);
        });

        it("should be chainable:", () => {
            snapdragon.parser
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

            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.ast.nodes.length, 5);
        });
    });
});

describe("util", "Snapdragon", "ast", () => {
    beforeEach(() => {
        snapdragon = new Snapdragon();
        snapdragon.parser
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
            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.orig, "a/b");
        });
    });

    describe("recursion", () => {
        beforeEach(() => {
            snapdragon.parser.set("text", function () {
                const pos = this.position();
                const m = this.match(/^\w/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "text",
                    val: m[0]
                });
            });

            snapdragon.parser.set("open", function () {
                const pos = this.position();
                const m = this.match(/^{/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "open",
                    val: m[0]
                });
            });

            snapdragon.parser.set("close", function () {
                const pos = this.position();
                const m = this.match(/^}/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "close",
                    val: m[0]
                });
            });

            snapdragon.parser.set("comma", function () {
                const pos = this.position();
                const m = this.match(/,/);
                if (!m) {
                    return;
                }
                return pos({
                    type: "comma",
                    val: m[0]
                });
            });
        });

        it("should set original string on `orig`", () => {
            snapdragon.parse("a{b,{c,d},e}f");
            assert.equal(snapdragon.parser.orig, "a{b,{c,d},e}f");
        });
    });
});
