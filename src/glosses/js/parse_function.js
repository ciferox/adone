const {
    is
} = adone;

const plugins = [
    (node, result) => {
        const isFn = node.type.endsWith("FunctionExpression");
        const isMethod = node.type === "ObjectExpression";

        if (!isFn && !isMethod) {
            return;
        }

        node = isMethod ? node.properties[0] : node;
        node.id = isMethod ? node.key : node.id;

        if (node.type === "Property") {
            const id = node.key;
            node = node.value;
            node.id = id;
        }

        // Props
        result.isArrow = node.type.startsWith("Arrow");
        result.isAsync = node.async || false;
        result.isGenerator = node.generator || false;
        result.isExpression = node.expression || false;
        result.isAnonymous = is.null(node.id);
        result.isNamed = !result.isAnonymous;

        // if real anonymous -> set to null,
        // notice that you can name you function `anonymous`, haha
        // and it won't be "real" anonymous, so `isAnonymous` will be `false`
        result.name = result.isAnonymous ? null : node.id.name;

        // Params
        if (!node.params.length) {
            return result;
        }

        node.params.forEach((param) => {
            const defaultArgsName =
                param.type === "AssignmentPattern" && param.left && param.left.name;

            const restArgName =
                param.type === "RestElement" && param.argument && param.argument.name;

            const name = param.name || defaultArgsName || restArgName;

            result.args.push(name);
            result.defaults[name] = param.right ? result.value.slice(param.right.start, param.right.end) : undefined;
        });
        result.params = result.args.join(", ");

        // body
        result.body = result.value.slice(node.body.start, node.body.end);

        const openCurly = result.body.charCodeAt(0) === 123;
        const closeCurly = result.body.charCodeAt(result.body.length - 1) === 125;

        if (openCurly && closeCurly) {
            result.body = result.body.slice(1, -1);
        }

        return result;
    }
];

export default (code, options) => {
    const result = {
        name: null,
        body: "",
        args: [],
        params: ""
    };

    if (is.function(code)) {
        code = code.toString("utf8");
    }

    if (!is.string(code)) {
        code = ""; // makes result.isValid === false
    }

    result.defaults = {};
    result.value = code;
    result.isValid = code.length > 0;
    result.isArrow = false;
    result.isAsync = false;
    result.isNamed = false;
    result.isAnonymous = false;
    result.isGenerator = false;
    result.isExpression = false;

    if (!result.isValid) {
        return result;
    }

    options = Object.assign({}, options);

    const node = adone.js.compiler.parseExpression(result.value, options);
    return plugins.reduce((res, fn) => fn(node, res) || res, result);
};
