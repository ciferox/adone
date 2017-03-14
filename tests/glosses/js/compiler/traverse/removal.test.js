const { parse, generate, traverse } = adone.js.compiler;

const getPath = (code) => {
    const ast = parse(code);
    let path;
    traverse(ast, {
        Program(_path) {
            path = _path;
            _path.stop();
        }
    });

    return path;
};

const generateCode = (path) => {
    return generate(path.node).code;
};

describe("removal", () => {
    describe("ArrowFunction", () => {
        it("remove body", () => {
            const rootPath = getPath("x = () => b;");
            const path = rootPath.get("body")[0].get("expression").get("right");
            const body = path.get("body");
            body.remove();

            assert.equal(generateCode(rootPath), "x = () => {};", "body should be replaced with BlockStatement");
        });
    });
});
