const { Snapdragon } = adone.util;
const { captureSet } = Snapdragon;
const { Parser } = adone.private(Snapdragon);
let parser;
let ast;

describe("util", "Snapdragon", "parser", () => {
    beforeEach(() => {
        parser = new Parser();
        parser.use(captureSet());
        parser.captureSet("brace", /^\{/, /^\}/);

        parser.set("text", function () {
            const pos = this.position();
            const match = this.match(/^[^{}]/);
            if (match) {
                return pos(this.node(match[0]));
            }
        });

        parser.set("comma", function () {
            const pos = this.position();
            const match = this.match(/,/);
            if (match) {
                return pos(this.node(match[0]));
            }
        });

        ast = parser.parse("a{b,{c,d},e}f");
    });

    describe(".isType", () => {
        it('should return true if "node" is the given "type"', () => {
            assert(ast.isType("root"));
            assert(ast.nodes[0].isType("bos"));
        });
    });

    describe(".hasType", () => {
        it('should return true if "node" has the given "type"', () => {
            assert(ast.hasType("bos"));
            assert(ast.hasType("eos"));
        });
    });

    describe(".first", () => {
        it("should get the first node in node.nodes", () => {
            assert(ast.first);
            assert(ast.first.isType("bos"));
        });
    });

    describe(".last", () => {
        it("should get the last node in node.nodes", () => {
            assert(ast.last);
            assert(ast.last.isType("eos"));
        });
    });

    describe(".next", () => {
        it("should get the next node in an array of nodes", () => {

            // console.log(ast)
        });
    });
});
