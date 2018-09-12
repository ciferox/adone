const {
    js: { compiler: { traverse, parse } }
} = adone;

const hop = function (o, key) {
    return Object.hasOwnProperty.call(o, key);
};

describe("js", "compiler", "traverse", "path/family", () => {
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
                expect(hop(paths, id)).to.equal(true);
            });
        });

        it("should contain outer bindings", () => {
            Object.keys(outerNodes).forEach((id) => {
                expect(hop(outerPaths, id)).to.equal(true);
            });
        });

        it("should return paths", () => {
            Object.keys(paths).forEach((id) => {
                expect(paths[id].node).to.exist();
                expect(paths[id].type).to.equal(paths[id].node.type);
            });

            Object.keys(outerPaths).forEach((id) => {
                expect(outerPaths[id].node).to.exist();
                expect(outerPaths[id].type).to.equal(outerPaths[id].node.type);
            });
        });

        it("should match paths and nodes returned for the same ast", () => {
            Object.keys(nodes).forEach((id) => {
                expect(nodes[id]).to.equal(paths[id].node);
            });
        });

        it("should match paths and nodes returned for outer Bindings", () => {
            Object.keys(outerNodes).forEach((id) => {
                expect(outerNodes[id]).to.equal(outerPaths[id].node);
            });
        });
    });
    describe("getSibling", () => {
        const ast = parse(
            "var a = 1, {b} = c, [d] = e; function f() {} function g() {}",
        );
        let sibling = {};
        let lastSibling = {};
        traverse(ast, {
            VariableDeclaration(path) {
                sibling = path.getSibling(path.key);
                lastSibling = sibling.getNextSibling().getNextSibling();
            }
        });

        it("should return traverse sibling nodes", () => {
            expect(sibling.getNextSibling().node).to.exist();
            expect(lastSibling.getPrevSibling().node).to.exist();
            expect(sibling.getPrevSibling().node).not.exist();
            expect(lastSibling.getNextSibling().node).not.exist();
        });

        it("should return all preceding and succeeding sibling nodes", () => {
            expect(sibling.getAllNextSiblings().length).to.exist();
            expect(lastSibling.getAllPrevSiblings().length).to.exist();
            expect(sibling.getAllNextSiblings()).to.lengthOf(2);
            expect(lastSibling.getAllPrevSiblings()).to.lengthOf(2);
        });
    });
});
