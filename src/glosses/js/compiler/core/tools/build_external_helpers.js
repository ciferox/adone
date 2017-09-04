const {
    js: { compiler: { helper, messages, generate, template, types: t } }
} = adone;

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
    const container = t.functionExpression(
        null,
        [t.identifier("global")],
        t.blockStatement(body),
    );
    const tree = t.program([
        t.expressionStatement(
            t.callExpression(container, [helper.get("selfGlobal")]),
        )
    ]);

    body.push(
        t.variableDeclaration("var", [
            t.variableDeclarator(
                namespace,
                t.assignmentExpression(
                    "=",
                    t.memberExpression(t.identifier("global"), namespace),
                    t.objectExpression([]),
                ),
            )
        ]),
    );

    builder(body);

    return tree;
};

const buildUmd = (namespace, builder) => {
    const body = [];
    body.push(
        t.variableDeclaration("var", [
            t.variableDeclarator(namespace, t.identifier("global"))
        ]),
    );

    builder(body);

    return t.program([
        buildUmdWrapper({
            FACTORY_PARAMETERS: t.identifier("global"),
            BROWSER_ARGUMENTS: t.assignmentExpression(
                "=",
                t.memberExpression(t.identifier("root"), namespace),
                t.objectExpression([]),
            ),
            COMMON_ARGUMENTS: t.identifier("exports"),
            AMD_ARGUMENTS: t.arrayExpression([t.stringLiteral("exports")]),
            FACTORY_BODY: body,
            UMD_ROOT: t.identifier("this")
        })
    ]);
};

const buildVar = (namespace, builder) => {
    const body = [];
    body.push(
        t.variableDeclaration("var", [
            t.variableDeclarator(namespace, t.objectExpression([]))
        ]),
    );
    builder(body);
    body.push(t.expressionStatement(namespace));
    return t.program(body);
};

const buildHelpers = (body, namespace, whitelist) => {
    helper.list.forEach((name) => {
        if (whitelist && whitelist.indexOf(name) < 0) {
            return;
        }

        const key = t.identifier(name);
        body.push(
            t.expressionStatement(
                t.assignmentExpression(
                    "=",
                    t.memberExpression(namespace, key),
                    helper.get(name),
                ),
            ),
        );
    });
};

export default function (
    whitelist?: Array<string>,
    outputType: "global" | "umd" | "var" = "global",
) {
    const namespace = t.identifier("babelHelpers");

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
