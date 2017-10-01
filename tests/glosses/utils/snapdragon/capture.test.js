const { Snapdragon } = adone.util;
const { capture } = Snapdragon;
let snapdragon;

describe("util", "Snapdragon", ".capture (plugin usage)", () => {
    beforeEach(() => {
        snapdragon = new Snapdragon();
        snapdragon.use(capture());
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

    describe(".capture():", () => {
        it("should register a parser", () => {
            snapdragon.capture("all", /^.*/);
            snapdragon.parse("a/b");
            assert(snapdragon.parsers.hasOwnProperty("all"));
        });

        it("should use middleware to parse", () => {
            snapdragon.capture("all", /^.*/);
            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.parsed, "a/b");
            assert.equal(snapdragon.parser.input, "");
        });

        it("should create ast node:", () => {
            snapdragon.capture("all", /^.*/);
            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.ast.nodes.length, 3);
        });

        it("should be chainable:", () => {
            snapdragon.parser
                .capture("text", /^\w+/)
                .capture("slash", /^\//);

            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.ast.nodes.length, 5);
        });

        it.skip("should emit tokens", () => {
            let count = 0;
            snapdragon.parser.on("token", () => {
                count++;
            });

            snapdragon.capture("all", /^.*/);
            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.parsed, "a/b");
            assert.equal(snapdragon.parser.input, "");
            assert.equal(count, 1);
        });
    });
});

describe("util", "Snapdragon", "ast", () => {
    beforeEach(() => {
        snapdragon = new Snapdragon();
        snapdragon.use(capture());
        snapdragon
            .capture("text", /^\w+/)
            .capture("slash", /^\//);
    });

    describe("orig:", () => {
        it("should add pattern to orig property", () => {
            snapdragon.parse("a/b");
            assert.equal(snapdragon.parser.orig, "a/b");
        });

        describe("recursion", () => {
            // TODO!
            beforeEach(() => {
                snapdragon
                    .capture("text", /^[^{},]+/)
                    .capture("open", /^\{/)
                    .capture("close", /^\}/)
                    .capture("comma", /,/);
            });

            it("should set original string on `orig`", () => {
                snapdragon.parse("a{b,{c,d},e}f");
                assert.equal(snapdragon.parser.orig, "a{b,{c,d},e}f");
            });
        });
    });
});
