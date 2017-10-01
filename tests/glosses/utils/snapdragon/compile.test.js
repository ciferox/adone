const { Compiler, Parser } = adone.private(adone.util.Snapdragon);

let compiler;
let parser;

describe("util", "Snapdragon", "compiler", () => {
    beforeEach(() => {
        compiler = new Compiler();
        parser = new Parser();
        parser
            .set("text", function () {
                const pos = this.position();
                const match = this.match(/^\w+/);
                if (match) {
                    return pos(this.node(match[0]));
                }
            })
            .set("slash", function () {
                const pos = this.position();
                const match = this.match(/^\//);
                if (match) {
                    return pos(this.node(match[0]));
                }
            });
    });

    describe("errors", () => {
        it("should throw an error when a compiler is missing", (cb) => {
            try {
                const ast = parser.parse("a/b/c");
                compiler.compile(ast);
                cb(new Error("expected an error"));
            } catch (err) {
                assert(err);
                assert.equal(err.message, 'string <line:1 column:2>: compiler "text" is not registered');
                cb();
            }
        });
    });

    describe(".compile", () => {
        beforeEach(() => {
            compiler
                .set("text", function (node) {
                    return this.emit(node.val);
                })
                .set("slash", function (node) {
                    return this.emit("-");
                });
        });

        it("should set the result on `output`", () => {
            const ast = parser.parse("a/b/c");
            const res = compiler.compile(ast);
            assert.equal(res.output, "a-b-c");
        });
    });
});
