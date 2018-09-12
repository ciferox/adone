const {
    is,
    js: { compiler: { types: t, parse, codeFrameColumns } }
} = adone;

const PATTERN = /^[_$A-Z0-9]+$/;

const resolveAncestors = function (ast, ancestors) {
    let parent = ast;
    for (let i = 0; i < ancestors.length - 1; i++) {
        const { key, index } = ancestors[i];

        if (is.undefined(index)) {
            parent = parent[key];
        } else {
            parent = parent[key][index];
        }
    }

    const { key, index } = ancestors[ancestors.length - 1];

    return { parent, key, index };
};

const parseWithCodeFrame = function (code, parserOpts) {
    parserOpts = {
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        sourceType: "module",
        ...parserOpts
    };

    try {
        // $FlowFixMe - The parser AST is not the same type as the babel-types type.
        return parse(code, parserOpts);
    } catch (err) {
        const loc = err.loc;
        if (loc) {
            err.message += `\n${codeFrameColumns(code, { start: loc })}`;
            err.code = "BABEL_TEMPLATE_PARSE_ERROR";
        }
        throw err;
    }
};


const placeholderVisitorHandler = function (node, ancestors, state) {
    let name;
    if (t.isIdentifier(node) || t.isJSXIdentifier(node)) {
        name = node.name;
    } else if (t.isStringLiteral(node)) {
        name = node.value;
    } else {
        return;
    }

    if (
        (!state.placeholderPattern || !state.placeholderPattern.test(name)) &&
        (!state.placeholderWhitelist || !state.placeholderWhitelist.has(name))
    ) {
        return;
    }

    // Keep our own copy of the ancestors so we can use it in .resolve().
    ancestors = ancestors.slice();

    const { node: parent, key } = ancestors[ancestors.length - 1];

    let type;
    if (t.isStringLiteral(node)) {
        type = "string";
    } else if (
        (t.isNewExpression(parent) && key === "arguments") ||
        (t.isCallExpression(parent) && key === "arguments") ||
        (t.isFunction(parent) && key === "params")
    ) {
        type = "param";
    } else if (t.isExpressionStatement(parent)) {
        type = "statement";
        ancestors = ancestors.slice(0, -1);
    } else {
        type = "other";
    }

    state.placeholders.push({
        name,
        type,
        resolve: (ast) => resolveAncestors(ast, ancestors),
        isDuplicate: state.placeholderNames.has(name)
    });
    state.placeholderNames.add(name);
};

export default function parseAndBuildMetadata(
    formatter,
    code,
    opts,
) {
    const ast = parseWithCodeFrame(code, opts.parser);

    const {
        placeholderWhitelist,
        placeholderPattern = PATTERN,
        preserveComments
    } = opts;

    t.removePropertiesDeep(ast, {
        preserveComments
    });

    formatter.validate(ast);

    const placeholders = [];
    const placeholderNames = new Set();

    t.traverse(ast, placeholderVisitorHandler, {
        placeholders,
        placeholderNames,
        placeholderWhitelist,
        placeholderPattern
    });

    return {
        ast,
        placeholders,
        placeholderNames
    };
}
