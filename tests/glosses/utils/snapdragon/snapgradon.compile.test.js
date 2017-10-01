const { Snapdragon } = adone.util;
let snapdragon;

describe("util", "Snapdragon", "snapdragon.compiler", () => {
    beforeEach(() => {
        snapdragon = new Snapdragon();
        snapdragon.parser
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

    describe("errors", (cb) => {
        it("should throw an error when a compiler is missing", (cb) => {
            try {
                const ast = snapdragon.parse("a/b/c");
                snapdragon.compile(ast);
                cb(new Error("expected an error"));
            } catch (err) {
                assert(err);
                assert.equal(err.message, 'string <line:1 column:2>: compiler "text" is not registered');
                cb();
            }
        });
    });

    describe("snapdragon.compile", () => {
        beforeEach(() => {
            snapdragon.compiler
                .set("text", function (node) {
                    return this.emit(node.val);
                })
                .set("slash", function (node) {
                    return this.emit("-");
                });
        });

        it("should set the result on `output`", () => {
            const ast = snapdragon.parse("a/b/c");
            const res = snapdragon.compile(ast);
            assert.equal(res.output, "a-b-c");
        });
    });
});
