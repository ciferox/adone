const {
    data: {
        yaml
    },
    is,
    error,
    std: {
        vm
    }
} = adone;

const resolveJavascriptFunction = (data) => {
    if (is.null(data)) {
        return false;
    }

    try {
        const source = `(${data})`;
        const { program: ast } = adone.js.parse(source);

        return !(
            ast.type !== "Program"
            || ast.body.length !== 1
            || ast.body[0].type !== "ExpressionStatement"
            || (ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression")
        );
    } catch (err) {
        return false;
    }
};

const constructJavascriptFunction = (data) => {
    const source = `(${data})`;
    const { program: ast } = adone.js.parse(source);

    if (ast.type !== "Program" ||
        ast.body.length !== 1 ||
        ast.body[0].type !== "ExpressionStatement" ||
        (ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression")
    ) {
        throw new error.InvalidArgumentException("Failed to resolve function");
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
