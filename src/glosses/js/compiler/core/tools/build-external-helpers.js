// @flow
import adone from "adone";
const { types, messages, helpers, template, generate } = adone.js.compiler;

const buildUmdWrapper = template(`
  (function (root, factory) {
    if (typeof define === "function" && define.amd) {
      define(AMD_ARGUMENTS, factory);
    } else if (typeof exports === "object") {
      factory(COMMON_ARGUMENTS);
    } else {
      factory(BROWSER_ARGUMENTS);
    }
  })(UMD_ROOT, function (FACTORY_PARAMETERS) {
    FACTORY_BODY
  });
`);

const buildGlobal = (namespace, builder) => {
    const body = [];
    const container = types.functionExpression(null, [types.identifier("global")], types.blockStatement(body));
    const tree = types.program([types.expressionStatement(types.callExpression(container, [helpers.get("selfGlobal")]))]);

    body.push(types.variableDeclaration("var", [
        types.variableDeclarator(
            namespace,
            types.assignmentExpression("=", types.memberExpression(types.identifier("global"), namespace), types.objectExpression([]))
        )
    ]));

    builder(body);

    return tree;
};

const buildUmd = (namespace, builder) => {
    const body = [];
    body.push(types.variableDeclaration("var", [
        types.variableDeclarator(namespace, types.identifier("global"))
    ]));

    builder(body);

    return types.program([
        buildUmdWrapper({
            FACTORY_PARAMETERS: types.identifier("global"),
            BROWSER_ARGUMENTS: types.assignmentExpression(
                "=",
                types.memberExpression(types.identifier("root"), namespace),
                types.objectExpression([])
            ),
            COMMON_ARGUMENTS: types.identifier("exports"),
            AMD_ARGUMENTS: types.arrayExpression([types.stringLiteral("exports")]),
            FACTORY_BODY: body,
            UMD_ROOT: types.identifier("this")
        })
    ]);
};

const buildVar = (namespace, builder) => {
    const body = [];
    body.push(types.variableDeclaration("var", [
        types.variableDeclarator(namespace, types.objectExpression([]))
    ]));
    builder(body);
    body.push(types.expressionStatement(namespace));
    return types.program(body);
};

const buildHelpers = (body, namespace, whitelist) => {
    for (let i = 0, n = helpers.list.length; i < n; ++i) {
        const name = helpers.list[i];
        if (whitelist && whitelist.indexOf(name) < 0) {
            continue;
        }

        const key = types.identifier(name);
        body.push(types.expressionStatement(
            types.assignmentExpression("=", types.memberExpression(namespace, key), helpers.get(name))
        ));
    }
};

export default function (
    whitelist?: string[],
    outputType: "global" | "umd" | "var" = "global"
) {
    const namespace = types.identifier("babelHelpers");

    const builder = function (body) {
        return buildHelpers(body, namespace, whitelist);
    };

    let tree;

    const build = {
        global: buildGlobal,
        umd: buildUmd,
        var: buildVar
    }[outputType];

    if (build) {
        tree = build(namespace, builder);
    } else {
        throw new Error(messages.get("unsupportedOutputType", outputType));
    }

    return generate(tree).code;
}
