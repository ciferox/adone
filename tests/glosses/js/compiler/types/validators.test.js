const {
    js: { parse, compiler: { types: t } }
} = adone;

describe("validators", () => {
    describe("isNodesEquivalent", () => {
        it("should handle simple cases", () => {
            const mem = t.memberExpression(t.identifier("a"), t.identifier("b"));
            expect(t.isNodesEquivalent(mem, mem)).to.be.equal(true);

            const mem2 = t.memberExpression(t.identifier("a"), t.identifier("c"));
            expect(t.isNodesEquivalent(mem, mem2)).to.be.equal(false);
        });

        it("should handle full programs", () => {
            expect(t.isNodesEquivalent(parse("1 + 1"), parse("1+1"))).to.be.equal(true);
            expect(t.isNodesEquivalent(parse("1 + 1"), parse("1+2"))).to.be.equal(false);
        });

        it("should handle complex programs", () => {
            const program = "'use strict'; function lol() { wow();return 1; }";

            expect(t.isNodesEquivalent(parse(program), parse(program))).to.be.equal(true);

            const program2 = "'use strict'; function lol() { wow();return -1; }";

            expect(t.isNodesEquivalent(parse(program), parse(program2))).to.be.equal(false);
        });

        it("should handle nodes with object properties", () => {
            const original = t.templateElement({ raw: "\\'a", cooked: "'a" }, true);
            const identical = t.templateElement({ raw: "\\'a", cooked: "'a" }, true);
            const different = t.templateElement({ raw: "'a", cooked: "'a" }, true);
            expect(t.isNodesEquivalent(original, identical)).to.be.equal(true);
            expect(t.isNodesEquivalent(original, different)).to.be.equal(false);
        });

        it("rejects 'await' as an identifier", () => {
            expect(t.isValidIdentifier("await")).to.be.equal(false);
        });
    });

    describe("isCompatTag", () => {
        it("should handle lowercase tag names", () => {
            expect(t.react.isCompatTag("div")).to.be.equal(true);
            expect(t.react.isCompatTag("a")).to.be.equal(true); // one letter
            expect(t.react.isCompatTag("h3")).to.be.equal(true); // letters and numbers
        });

        it("should handle custom element tag names", () => {
            expect(t.react.isCompatTag("plastic-button")).to.be.equal(true); // ascii letters
            expect(t.react.isCompatTag("math-α")).to.be.equal(true); // non-latin chars
            expect(t.react.isCompatTag("img-viewer2")).to.be.equal(true); // numbers
            expect(t.react.isCompatTag("emotion-😍")).to.be.equal(true); // emoji
        });

        it("accepts trailing dash '-' in custom element tag names", () => {
            expect(t.react.isCompatTag("div-")).to.be.equal(true);
            expect(t.react.isCompatTag("a-")).to.be.equal(true);
            expect(t.react.isCompatTag("h3-")).to.be.equal(true);
        });

        it("rejects empty or null tag names", () => {
            expect(t.react.isCompatTag(null)).to.be.equal(false);
            expect(t.react.isCompatTag()).to.be.equal(false);
            expect(t.react.isCompatTag(undefined)).to.be.equal(false);
            expect(t.react.isCompatTag("")).to.be.equal(false);
        });

        it("rejects tag names starting with an uppercase letter", () => {
            expect(t.react.isCompatTag("Div")).to.be.equal(false);
            expect(t.react.isCompatTag("A")).to.be.equal(false);
            expect(t.react.isCompatTag("H3")).to.be.equal(false);
        });

        it("rejects all uppercase tag names", () => {
            expect(t.react.isCompatTag("DIV")).to.be.equal(false);
            expect(t.react.isCompatTag("A")).to.be.equal(false);
            expect(t.react.isCompatTag("H3")).to.be.equal(false);
        });

        it("rejects leading dash '-'", () => {
            expect(t.react.isCompatTag("-div")).to.be.equal(false);
            expect(t.react.isCompatTag("-a")).to.be.equal(false);
            expect(t.react.isCompatTag("-h3")).to.be.equal(false);
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

            expect(t.isNodesEquivalent(pattern, pattern)).to.be.equal(true);
        });
    });

    describe("isReferenced", () => {
        it("returns false if node is a key of ObjectTypeProperty", () => {
            const node = t.identifier("a");
            const parent = t.objectTypeProperty(node, t.numberTypeAnnotation());

            expect(t.isReferenced(node, parent)).to.be.equal(false);
        });

        it("returns true if node is a value of ObjectTypeProperty", () => {
            const node = t.identifier("a");
            const parent = t.objectTypeProperty(
                t.identifier("someKey"),
                t.genericTypeAnnotation(node),
            );

            expect(t.isReferenced(node, parent)).to.be.equal(true);
        });

        it("returns true if node is a value of ObjectProperty of an expression", () => {
            const node = t.identifier("a");
            const parent = t.objectProperty(t.identifier("key"), node);
            const grandparent = t.objectExpression([parent]);

            expect(t.isReferenced(node, parent, grandparent)).to.be.equal(true);
        });

        it("returns false if node is a value of ObjectProperty of a pattern", () => {
            const node = t.identifier("a");
            const parent = t.objectProperty(t.identifier("key"), node);
            const grandparent = t.objectPattern([parent]);

            expect(t.isReferenced(node, parent, grandparent)).to.be.equal(false);
        });

        describe("TSPropertySignature", () => {
            it("returns false if node is a key", () => {
                // { A: string }
                const node = t.identifier("A");
                const parent = t.tsPropertySignature(
                    node,
                    t.tsTypeAnnotation(t.tsStringKeyword()),
                );

                expect(t.isReferenced(node, parent)).to.be.equal(false);
            });

            it("returns true if node is a value", () => {
                // { someKey: A }
                const node = t.identifier("A");
                const parent = t.tsPropertySignature(
                    t.identifier("someKey"),
                    t.tsTypeAnnotation(t.tsTypeReference(node)),
                );

                expect(t.isReferenced(node, parent)).to.be.equal(true);
            });
        });

        describe("TSEnumMember", () => {
            it("returns false if node is an id", () => {
                // enum X = { A };
                const node = t.identifier("A");
                const parent = t.tsEnumMember(node);

                expect(t.isReferenced(node, parent)).to.be.equal(false);
            });

            it("returns true if node is a value", () => {
                // enum X = { Foo = A }
                const node = t.identifier("A");
                const parent = t.tsEnumMember(t.identifier("Foo"), node);

                expect(t.isReferenced(node, parent)).to.be.equal(true);
            });
        });
    });

    describe("isBinding", () => {
        it("returns false if node id a value of ObjectProperty of an expression", () => {
            const node = t.identifier("a");
            const parent = t.objectProperty(t.identifier("key"), node);
            const grandparent = t.objectExpression([parent]);

            expect(t.isBinding(node, parent, grandparent)).to.be.equal(false);
        });

        it("returns true if node id a value of ObjectProperty of a pattern", () => {
            const node = t.identifier("a");
            const parent = t.objectProperty(t.identifier("key"), node);
            const grandparent = t.objectPattern([parent]);

            expect(t.isBinding(node, parent, grandparent)).to.be.equal(true);
        });
    });

    describe("isType", () => {
        it("returns true if nodeType equals targetType", () => {
            expect(t.isType("Identifier", "Identifier")).to.be.equal(true);
        });
        it("returns false if targetType is a primary node type", () => {
            expect(t.isType("Expression", "ArrayExpression")).to.be.equal(false);
        });
        it("returns true if targetType is an alias of nodeType", () => {
            expect(t.isType("ArrayExpression", "Expression")).to.be.equal(true);
        });
        it("returns false if nodeType and targetType are unrelated", () => {
            expect(t.isType("ArrayExpression", "ClassBody")).to.be.equal(false);
        });
        it("returns false if nodeType is undefined", () => {
            expect(t.isType(undefined, "Expression")).to.be.equal(false);
        });
    });

    describe("placeholders", () => {
        describe("isPlaceholderType", () => {
            describe("when placeholderType is a specific node type", () => {
                const placeholder = "Identifier";

                it("returns true if targetType is placeholderType", () => {
                    expect(t.isPlaceholderType(placeholder, "Identifier")).to.be.equal(true);
                });
                it("returns true if targetType an alias for placeholderType", () => {
                    expect(t.isPlaceholderType(placeholder, "Expression")).to.be.equal(true);
                });
                it("returns false for unrelated types", () => {
                    expect(t.isPlaceholderType(placeholder, "String")).to.be.equal(false);
                });
            });

            describe("when placeholderType is a generic alias type", () => {
                const placeholder = "Pattern";

                it("returns true if targetType is placeholderType", () => {
                    expect(t.isPlaceholderType(placeholder, "Pattern")).to.be.equal(true);
                });
                it("returns true if targetType an alias for placeholderType", () => {
                    expect(t.isPlaceholderType(placeholder, "LVal")).to.be.equal(true);
                });
                it("returns false for unrelated types", () => {
                    expect(t.isPlaceholderType(placeholder, "Expression")).to.be.equal(false);
                });
                it("returns false if targetType is aliased by placeholderType", () => {
                    // i.e. a Pattern might not be an Identifier
                    expect(t.isPlaceholderType(placeholder, "Identifier")).to.be.equal(false);
                });
            });
        });

        describe("is", () => {
            describe("when the placeholder matches a specific node", () => {
                const identifier = t.placeholder("Identifier", t.identifier("foo"));

                it("returns false if targetType is expectedNode", () => {
                    expect(t.is("Identifier", identifier)).to.be.equal(false);
                });
                it("returns true if targetType is an alias", () => {
                    expect(t.is("LVal", identifier)).to.be.equal(true);
                });
            });

            describe("when the placeholder matches a generic alias", () => {
                const pattern = t.placeholder("Pattern", t.identifier("bar"));

                it("returns false if targetType is aliased as expectedNode", () => {
                    // i.e. a Pattern might not be an Identifier
                    expect(t.is("Identifier", pattern)).to.be.equal(false);
                });
                it("returns true if targetType is expectedNode", () => {
                    expect(t.is("Pattern", pattern)).to.be.equal(true);
                });
                it("returns true if targetType is an alias for expectedNode", () => {
                    expect(t.is("LVal", pattern)).to.be.equal(true);
                });
            });
        });

        describe("is[Type]", () => {
            describe("when the placeholder matches a specific node", () => {
                const identifier = t.placeholder("Identifier", t.identifier("foo"));

                it("returns false if targetType is expectedNode", () => {
                    expect(t.isIdentifier(identifier)).to.be.equal(false);
                });
                it("returns true if targetType is an alias", () => {
                    expect(t.isLVal(identifier)).to.be.equal(true);
                });
            });

            describe("when the placeholder matches a generic alias", () => {
                const pattern = t.placeholder("Pattern", t.identifier("bar"));

                it("returns false if targetType is aliased as expectedNode", () => {
                    expect(t.isIdentifier(pattern)).to.be.equal(false);
                });
                it("returns true if targetType is expectedNode", () => {
                    expect(t.isPattern(pattern)).to.be.equal(true);
                });
                it("returns true if targetType is an alias for expectedNode", () => {
                    expect(t.isLVal(pattern)).to.be.equal(true);
                });
            });
        });
    });
});
