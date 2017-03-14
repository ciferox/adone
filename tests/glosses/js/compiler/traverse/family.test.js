const { parse, traverse } = adone.js.compiler;
const hop = adone.is.propertyOwned;

describe("path/family", () => {
    describe("getBindingIdentifiers", () => {
        const ast = parse("var a = 1, {b} = c, [d] = e; function f() {}");
        let nodes = {};
        let paths = {};
        let outerNodes = {};
        let outerPaths = {};

        traverse(ast, {
            VariableDeclaration(path) {
                nodes = path.getBindingIdentifiers();
                paths = path.getBindingIdentifierPaths();
            },
            FunctionDeclaration(path) {
                outerNodes = path.getOuterBindingIdentifiers();
                outerPaths = path.getOuterBindingIdentifierPaths();
            }
        });

        it("should contain keys of nodes in paths", () => {
            Object.keys(nodes).forEach((id) => {
                assert.strictEqual(hop(paths, id), true, "Node's keys exists in paths");
            });
        });

        it("should contain outer bindings", () => {
            Object.keys(outerNodes).forEach((id) => {
                assert.strictEqual(hop(outerPaths, id), true, "Has same outer keys");
            });
        });

        it("should return paths", () => {
            Object.keys(paths).forEach((id) => {
                assert.strictEqual(Boolean(paths[id].node), true, "Has a property node that's not falsy");
                assert.strictEqual(paths[id].type, paths[id].node.type, "type matches");
            });

            Object.keys(outerPaths).forEach((id) => {
                assert.strictEqual(Boolean(outerPaths[id].node), true, "has property node");
                assert.strictEqual(outerPaths[id].type, outerPaths[id].node.type, "type matches");
            });
        });

        it("should match paths and nodes returned for the same ast", () => {
            Object.keys(nodes).forEach((id) => {
                assert.strictEqual(nodes[id], paths[id].node, "Nodes match");
            });
        });

        it("should match paths and nodes returned for outer Bindings", () => {
            Object.keys(outerNodes).forEach((id) => {
                assert.strictEqual(outerNodes[id], outerPaths[id].node, "nodes match");
            });
        });
    });
});
