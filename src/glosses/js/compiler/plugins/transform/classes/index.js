import LooseTransformer from "./loose";
import VanillaTransformer from "./vanilla";

const {
    js: { compiler: { types: t, helper: { annotateAsPure, functionName: nameFunction, splitExportDeclaration, pluginUtils } } },
    util: { globals }
} = adone;

const getBuiltinClasses = (category) =>
    Object.keys(globals[category]).filter((name) => /^[A-Z]/.test(name));

const builtinClasses = new Set([
    ...getBuiltinClasses("builtin"),
    ...getBuiltinClasses("browser")
]);

export default pluginUtils.declare((api, options) => {
    api.assertVersion(7);

    const { loose } = options;
    const Constructor = loose ? LooseTransformer : VanillaTransformer;

    // todo: investigate traversal requeueing
    const VISITED = Symbol();

    return {
        visitor: {
            ExportDefaultDeclaration(path) {
                if (!path.get("declaration").isClassDeclaration()) {
                    return;
                }
                splitExportDeclaration(path);
            },

            ClassDeclaration(path) {
                const { node } = path;

                const ref = node.id || path.scope.generateUidIdentifier("class");

                path.replaceWith(
                    t.variableDeclaration("let", [
                        t.variableDeclarator(ref, t.toExpression(node))
                    ]),
                );
            },

            ClassExpression(path, state) {
                const { node } = path;
                if (node[VISITED]) {
                    return;
                }

                const inferred = nameFunction(path);
                if (inferred && inferred !== node) {
                    path.replaceWith(inferred);
                    return;
                }

                node[VISITED] = true;

                path.replaceWith(
                    new Constructor(path, state.file, builtinClasses).run(),
                );

                if (path.isCallExpression()) {
                    annotateAsPure(path);
                    if (path.get("callee").isArrowFunctionExpression()) {
                        path.get("callee").arrowFunctionToExpression();
                    }
                }
            }
        }
    };
});
