const {
    is
} = adone;
import { srcPath } from "./helpers";
import fs from "fs";
import path from "path";
const types = require(srcPath("lib/types"));
const { parse } = require(srcPath("lib/parser"));
const hasOwn = Object.prototype.hasOwnProperty;
// Babel 7 no longer supports Node 4 or 5.
const nodeMajorVersion = parseInt(process.versions.node, 10);
(nodeMajorVersion >= 6 ? describe : xdescribe)("syntax", () => {
    // Make sure we handle all possible node types in Syntax, and no additional
    // types that are not present in Syntax.
    it.todo("Completeness", (done) => {
        const printer = srcPath("lib/printer.js");
        fs.readFile(printer, "utf-8", (err, data) => {
            assert.ok(!err);
            const ast = parse(data);
            assert.ok(ast);
            const typeNames = {};
            types.visit(ast, {
                visitFunctionDeclaration(path) {
                    const decl = path.node;
                    if (types.namedTypes.Identifier.check(decl.id) &&
                        decl.id.name === "genericPrintNoParens") {
                        this.traverse(path, {
                            visitSwitchCase(path) {
                                const test = path.node.test;
                                if (test &&
                                    test.type === "StringLiteral" &&
                                    is.string(test.value)) {
                                    const name = test.value;
                                    typeNames[name] = name;
                                }
                                return false;
                            }
                        });
                    } else {
                        this.traverse(path);
                    }
                }
            });
            for (const name in types.namedTypes) {
                if (hasOwn.call(types.namedTypes, name)) {
                    assert.ok(hasOwn.call(typeNames, name), `unhandled type: ${name}`);
                    assert.strictEqual(name, typeNames[name]);
                    delete typeNames[name];
                }
            }
            done();
        });
    });
});
