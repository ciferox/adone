const { data: { yaml }, is, x, std: { vm } } = adone;

const resolveJavascriptFunction = (data) => {
    if (is.null(data)) {
        return false;
    }

    try {
        const source = `(${data})`;
        const { program: ast } = adone.js.compiler.parse(source);

        return ast.type === "Program" &&
               ast.body.length === 1 &&
               ast.body[0].type === "ExpressionStatement" &&
               ast.body[0].expression.type === "FunctionExpression";
    } catch (err) {
        return false;
    }
};

const constructJavascriptFunction = (data) => {
    const source = `(${data})`;
    const { program: ast } = adone.js.compiler.parse(source);

    if (ast.type !== "Program" ||
        ast.body.length !== 1 ||
        ast.body[0].type !== "ExpressionStatement" ||
        ast.body[0].expression.type !== "FunctionExpression"
    ) {
        throw new error.InvalidArgument("Failed to resolve function");
    }

    return vm.runInThisContext(source);
};

export default new yaml.type.Type("tag:yaml.org,2002:js/function", {
    kind: "scalar",
    resolve: resolveJavascriptFunction,
    construct: constructJavascriptFunction,
    predicate: is.function,
    represent: (object) => object.toString()
});
