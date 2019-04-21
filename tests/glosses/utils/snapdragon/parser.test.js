const { is } = adone;
const { Parser } = adone.getPrivate(adone.util.Snapdragon);
let parser;

describe("util", "Snapdragon", "parser", () => {
    beforeEach(() => {
        parser = new Parser();
    });

    describe("constructor:", () => {
        it("should return an instance of Parser:", () => {
            assert(parser instanceof Parser);
        });
    });

    // ensures that we catch and document API changes
    describe("prototype methods:", () => {
        const methods = [
            "updatePosition",
            "position",
            "error",
            "set",
            "parse",
            "match",
            "use"
        ];

        methods.forEach((method) => {
            it(`should expose the \`${method}\` method`, () => {
                assert.equal(typeof parser[method], "function");
            });
        });
    });

    describe("parsers", () => {
        beforeEach(() => {
            parser = new Parser();
        });

        describe(".set():", () => {
            it("should register a named middleware", () => {
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

                assert(is.function(parser.parsers.all));
            });

            it("should expose named parsers to middleware:", () => {
                let count = 0;

                parser.set("word", function () {
                    const pos = this.position();
                    const m = this.match(/^\w/);
                    if (!m) {
                        return;
                    }

                    return pos({
                        type: "word",
                        val: m[0]
                    });
                });

                parser.set("slash", function () {
                    const pos = this.position();
                    const m = this.match(/^\//);
                    if (!m) {
                        return;
                    }

                    const word = this.parsers.word();
                    const prev = this.prev();

                    const node = pos({
                        type: "slash",
                        val: m[0]
                    });

                    if (word && word.type === "word") {
                        count++;
                    }

                    prev.nodes.push(node);
                    prev.nodes.push(word);
                });

                parser.parse("a/b");
                assert.equal(parser.ast.nodes.length, 5);
                assert.equal(count, 1);
            });
        });
    });
});
