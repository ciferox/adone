/* eslint-disable func-style */

const {
    std: { fs }
} = adone;

import types from "./lib/types";
import { parse } from "./lib/parser";
import { Printer } from "./lib/printer";

function print(node, options) {
    return new Printer(options).print(node);
}
function prettyPrint(node, options) {
    return new Printer(options).printGenerically(node);
}
function run(transformer, options) {
    return runFile(process.argv[2], transformer, options);
}
function runFile(path, transformer, options) {
    fs.readFile(path, "utf-8", (err, code) => {
        if (err) {
            console.error(err);
            return;
        }
        runString(code, transformer, options);
    });
}
function defaultWriteback(output) {
    process.stdout.write(output);
}
function runString(code, transformer, options) {
    const writeback = options && options.writeback || defaultWriteback;
    transformer(parse(code, options), (node) => {
        writeback(print(node, options).code);
    });
}
const main = {};
Object.defineProperties(main, {
    /**
     * Parse a string of code into an augmented syntax tree suitable for
     * arbitrary modification and reprinting.
     */
    parse: {
        enumerable: true,
        value: parse
    },
    /**
     * Traverse and potentially modify an abstract syntax tree using a
     * convenient visitor syntax:
     *
     *   recast.visit(ast, {
     *     names: [],
     *     visitIdentifier: function(path) {
     *       var node = path.value;
     *       this.visitor.names.push(node.name);
     *       this.traverse(path);
     *     }
     *   });
     */
    visit: {
        enumerable: true,
        value: types.visit
    },
    /**
     * Reprint a modified syntax tree using as much of the original source
     * code as possible.
     */
    print: {
        enumerable: true,
        value: print
    },
    /**
     * Print without attempting to reuse any original source code.
     */
    prettyPrint: {
        enumerable: false,
        value: prettyPrint
    },
    /**
     * Customized version of require("ast-types").
     */
    types: {
        enumerable: false,
        value: types
    },
    /**
     * Convenient command-line interface (see e.g. example/add-braces).
     */
    run: {
        enumerable: false,
        value: run
    }
});
export default main;
// Type exports
export { ASTNode, NamedTypes, Builders, NodePath, Type } from "./lib/types";
