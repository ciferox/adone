const {
    js: { recast },
    std: { path: { join } }
} = adone;

import { srcPath } from "./helpers";
import fs from "fs";
import path from "path";
const types = require(srcPath("lib/types"));

const nodeMajorVersion = parseInt(process.versions.node, 10);
function testFile(path, options = {}) {
    fs.readFile(path, "utf-8", (err, source) => {
        assert.equal(err, null);
        assert.strictEqual(typeof source, "string");
        const ast = recast.parse(source, options);
        types.astNodesAreEquivalent.assert(ast.original, ast);
        const code = recast.print(ast).code;
        assert.strictEqual(source, code);
    });
}
function addTest(name) {
    it(name, () => {
        const filename = path.resolve(__dirname, name);
        testFile(filename);
    });
}

describe("identity", () => {
    // Add more tests here as need be.
    addTest("data/regexp-props.js");
    addTest("data/empty.js");
    addTest("data/backbone.js");
    addTest("lines.test.js");
    addTest(srcPath("lib/lines.js"));
    addTest(srcPath("lib/printer.js"));
});
