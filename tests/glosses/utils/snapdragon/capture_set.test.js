const { Snapdragon } = adone.util;
const { captureSet } = Snapdragon;
const { Parser, util } = adone.getPrivate(Snapdragon);
let parser;

describe("util", "Snapdragon", "parser", () => {
    beforeEach(() => {
        parser = new Parser();
        parser.use(captureSet());
    });

    it("should register open and close functions", () => {
        parser.captureSet("brace", /^\{/, /^\}/);

        parser.set("text", function () {
            const pos = this.position();
            const m = this.match(/^[^{}]/);
            if (!m) {
                return;
            }
            return pos({
                type: "text",
                val: m[0]
            });
        });

        const ast = parser.parse("a{b,{c,d},e}f");
        assert(util.hasType(ast, "brace"));
        assert(util.hasType(ast.nodes[2], "brace.open"));
        assert(util.hasType(ast.nodes[2], "brace.close"));
    });
});
