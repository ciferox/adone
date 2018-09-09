const {
    js: { compiler: { types: t, parse } }
} = adone;

describe("js", "compiler", "types", "validators", () => {
    describe("isNodesEquivalent", () => {
        it("should handle simple cases", () => {
            const mem = t.memberExpression(t.identifier("a"), t.identifier("b"));
            expect(t.isNodesEquivalent(mem, mem)).to.equal(true);

            const mem2 = t.memberExpression(t.identifier("a"), t.identifier("c"));
            expect(t.isNodesEquivalent(mem, mem2)).to.equal(false);
        });

        it("should handle full programs", () => {
            expect(t.isNodesEquivalent(parse("1 + 1"), parse("1+1"))).to.equal(true);
            expect(t.isNodesEquivalent(parse("1 + 1"), parse("1+2"))).to.equal(false);
        });

        it("should handle complex programs", () => {
            const program = "'use strict'; function lol() { wow();return 1; }";

            expect(t.isNodesEquivalent(parse(program), parse(program))).to.equal(true);

            const program2 = "'use strict'; function lol() { wow();return -1; }";

            expect(t.isNodesEquivalent(parse(program), parse(program2))).to.equal(false);
        });

        it("should handle nodes with object properties", () => {
            const original = t.templateElement({ raw: "\\'a", cooked: "'a" }, true);
            const identical = t.templateElement({ raw: "\\'a", cooked: "'a" }, true);
            const different = t.templateElement({ raw: "'a", cooked: "'a" }, true);
            expect(t.isNodesEquivalent(original, identical)).to.equal(true);
            expect(t.isNodesEquivalent(original, different)).to.equal(false);
        });

        it("rejects 'await' as an identifier", () => {
            expect(t.isValidIdentifier("await")).to.equal(false);
        });
    });


    describe("isCompatTag", () => {
        it("should handle lowercase tag names", () => {
            expect(t.react.isCompatTag("div")).to.equal(true);
            expect(t.react.isCompatTag("a")).to.equal(true); // one letter
            expect(t.react.isCompatTag("h3")).to.equal(true); // letters and numbers
        });

        it("should handle custom element tag names", () => {
            expect(t.react.isCompatTag("plastic-button")).to.equal(true); // ascii letters
            expect(t.react.isCompatTag("math-α")).to.equal(true); // non-latin chars
            expect(t.react.isCompatTag("img-viewer2")).to.equal(true); // numbers
            expect(t.react.isCompatTag("emotion-😍")).to.equal(true); // emoji
        });

        it("accepts trailing dash '-' in custom element tag names", () => {
            expect(t.react.isCompatTag("div-")).to.equal(true);
            expect(t.react.isCompatTag("a-")).to.equal(true);
            expect(t.react.isCompatTag("h3-")).to.equal(true);
        });

        it("rejects empty or null tag names", () => {
            expect(t.react.isCompatTag(null)).to.equal(false);
            expect(t.react.isCompatTag()).to.equal(false);
            expect(t.react.isCompatTag(undefined)).to.equal(false);
            expect(t.react.isCompatTag("")).to.equal(false);
        });

        it("rejects tag names starting with an uppercase letter", () => {
            expect(t.react.isCompatTag("Div")).to.equal(false);
            expect(t.react.isCompatTag("A")).to.equal(false);
            expect(t.react.isCompatTag("H3")).to.equal(false);
        });

        it("rejects all uppercase tag names", () => {
            expect(t.react.isCompatTag("DIV")).to.equal(false);
            expect(t.react.isCompatTag("A")).to.equal(false);
            expect(t.react.isCompatTag("H3")).to.equal(false);
        });

        it("rejects leading dash '-'", () => {
            expect(t.react.isCompatTag("-div")).to.equal(false);
            expect(t.react.isCompatTag("-a")).to.equal(false);
            expect(t.react.isCompatTag("-h3")).to.equal(false);
        });
    });

    describe("patterns", () => {
        it("allows nested pattern structures", () => {
            const pattern = t.objectPattern([
                t.objectProperty(
                    t.identifier("a"),
                    t.objectPattern([
                        t.objectProperty(t.identifier("b"), t.identifier("foo")),
                        t.objectProperty(
                            t.identifier("c"),
                            t.arrayPattern([t.identifier("value")]),
                        )
                    ]),
                )
            ]);

            expect(t.isNodesEquivalent(pattern, pattern)).to.equal(true);
        });
    });

    describe("isReferenced", () => {
        it("returns false if node is a key of ObjectTypeProperty", () => {
            const node = t.identifier("a");
            const parent = t.objectTypeProperty(node, t.numberTypeAnnotation());

            expect(t.isReferenced(node, parent)).to.equal(false);
        });

        it("returns true if node is a value of ObjectTypeProperty", () => {
            const node = t.identifier("a");
            const parent = t.objectTypeProperty(
                t.identifier("someKey"),
                t.genericTypeAnnotation(node),
            );

            expect(t.isReferenced(node, parent)).to.equal(true);
        });
    });
});
