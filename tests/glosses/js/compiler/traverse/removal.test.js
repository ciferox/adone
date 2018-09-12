const {
    js: { compiler: { parse, generate, traverse } }
} = adone;

const getPath = function (code) {
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

const generateCode = function (path) {
    return generate(path.node).code;
};

describe("js", "compiler", "traverse", "removal", () => {
    describe("ArrowFunction", () => {
        it("remove body", () => {
            const rootPath = getPath("x = () => b;");
            const path = rootPath
                .get("body")[0]
                .get("expression")
                .get("right");
            const body = path.get("body");
            body.remove();

            expect(generateCode(rootPath)).to.equal("x = () => {};");
        });
    });
});
