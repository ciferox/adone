// @flow
import transformClass from "./transformClass";

const {
  js: { compiler: { types: t, helper: { annotateAsPure, functionName: nameFunction, splitExportDeclaration, pluginUtils: { declare } } } },
  globals
} = adone;

const getBuiltinClasses = (category) =>
  Object.keys(globals[category]).filter((name) => /^[A-Z]/.test(name));

const builtinClasses = new Set([
  ...getBuiltinClasses("builtin"),
  ...getBuiltinClasses("browser")
]);

export default declare((api, options) => {
  api.assertVersion(7);

  const { loose } = options;

  // todo: investigate traversal requeueing
  const VISITED = Symbol();

  return {
    visitor: {
      ExportDefaultDeclaration(path: NodePath) {
        if (!path.get("declaration").isClassDeclaration()) { return; }
        splitExportDeclaration(path);
      },

      ClassDeclaration(path: NodePath) {
        const { node } = path;

        const ref = node.id || path.scope.generateUidIdentifier("class");

        path.replaceWith(
          t.variableDeclaration("let", [
            t.variableDeclarator(ref, t.toExpression(node))
          ]),
        );
      },

      ClassExpression(path: NodePath, state: any) {
        const { node } = path;
        if (node[VISITED]) { return; }

        const inferred = nameFunction(path);
        if (inferred && inferred !== node) {
          path.replaceWith(inferred);
          return;
        }

        node[VISITED] = true;

        path.replaceWith(
          transformClass(path, state.file, builtinClasses, loose),
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
