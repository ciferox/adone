const {
  js: { compiler: { traverse, types: t, template, helper: { functionName: nameFunction, pluginUtils: { declare }, ReplaceSupers: { environmentVisitor } } } }
} = adone;


export default declare((api, options) => {
  api.assertVersion(7);

  const { loose } = options;

  const findBareSupers = traverse.visitors.merge([
    {
      Super(path) {
        const { node, parentPath } = path;
        if (parentPath.isCallExpression({ callee: node })) {
          this.push(parentPath);
        }
      },
    },
    environmentVisitor,
  ]);

  const referenceVisitor = {
    "TSTypeAnnotation|TypeAnnotation"(path) {
      path.skip();
    },

    ReferencedIdentifier(path) {
      if (this.scope.hasOwnBinding(path.node.name)) {
        this.scope.rename(path.node.name);
        path.skip();
      }
    },
  };

  const classFieldDefinitionEvaluationTDZVisitor = traverse.visitors.merge([
    {
      ReferencedIdentifier(path) {
        if (this.classRef === path.scope.getBinding(path.node.name)) {
          const classNameTDZError = this.file.addHelper("classNameTDZError");
          const throwNode = t.callExpression(classNameTDZError, [
            t.stringLiteral(path.node.name),
          ]);

          path.replaceWith(t.sequenceExpression([throwNode, path.node]));
          path.skip();
        }
      },
    },
    environmentVisitor,
  ]);

  const foldDefinePropertyCalls = nodes =>
    t.expressionStatement(
      nodes.reduce((folded, node) => {
        // update defineProperty's obj argument
        node.arguments[0] = folded;
        return node;
      }),
    );

  const buildClassPropertySpec = (
    ref,
    { key, value, computed },
    scope,
    state,
  ) => {
    return t.callExpression(state.addHelper("defineProperty"), [
      ref,
      t.isIdentifier(key) && !computed ? t.stringLiteral(key.name) : key,
      value || scope.buildUndefinedNode(),
    ]);
  };

  const buildClassPropertyLoose = (ref, { key, value, computed }, scope) => {
    return template.statement`MEMBER = VALUE`({
      MEMBER: t.memberExpression(
        t.cloneNode(ref),
        key,
        computed || t.isLiteral(key),
      ),
      VALUE: value || scope.buildUndefinedNode(),
    });
  };

  const buildClassProperty = loose
    ? buildClassPropertyLoose
    : buildClassPropertySpec;

  return {
    inherits: adone.js.compiler.plugin.syntax.classProperties,

    visitor: {
      Class(path, state) {
        const isDerived = !!path.node.superClass;
        let constructor;
        const props = [];
        const computedPaths = [];
        const body = path.get("body");

        for (const path of body.get("body")) {
          if (path.node.computed) {
            computedPaths.push(path);
          }

          if (path.isClassProperty()) {
            props.push(path);
          } else if (path.isClassMethod({ kind: "constructor" })) {
            constructor = path;
          }
        }

        if (!props.length) return;

        let ref;

        if (path.isClassExpression() || !path.node.id) {
          nameFunction(path);
          ref = path.scope.generateUidIdentifier("class");
        } else {
          // path.isClassDeclaration() && path.node.id
          ref = path.node.id;
        }

        const computedNodes = [];
        const staticNodes = [];
        const instanceBody = [];

        for (const computedPath of computedPaths) {
          const computedNode = computedPath.node;
          // Make sure computed property names are only evaluated once (upon class definition)
          // and in the right order in combination with static properties
          if (!computedPath.get("key").isConstantExpression()) {
            computedPath.traverse(classFieldDefinitionEvaluationTDZVisitor, {
              classRef: path.scope.getBinding(ref.name),
              file: this.file,
            });
            const ident = path.scope.generateUidIdentifierBasedOnNode(
              computedNode.key,
            );
            computedNodes.push(
              t.variableDeclaration("var", [
                t.variableDeclarator(ident, computedNode.key),
              ]),
            );
            computedNode.key = t.cloneNode(ident);
          }
        }

        for (const prop of props) {
          const propNode = prop.node;
          if (propNode.decorators && propNode.decorators.length > 0) continue;

          if (propNode.static) {
            staticNodes.push(
              buildClassProperty(ref, propNode, path.scope, state),
            );
          } else {
            instanceBody.push(
              buildClassProperty(
                t.thisExpression(),
                propNode,
                path.scope,
                state,
              ),
            );
          }
        }

        const afterNodes =
          !loose && staticNodes.length
            ? foldDefinePropertyCalls(staticNodes)
            : staticNodes;

        if (instanceBody.length) {
          const assignments = loose
            ? instanceBody
            : foldDefinePropertyCalls(instanceBody);

          if (!constructor) {
            const newConstructor = t.classMethod(
              "constructor",
              t.identifier("constructor"),
              [],
              t.blockStatement([]),
            );
            if (isDerived) {
              newConstructor.params = [t.restElement(t.identifier("args"))];
              newConstructor.body.body.push(
                t.returnStatement(
                  t.callExpression(t.super(), [
                    t.spreadElement(t.identifier("args")),
                  ]),
                ),
              );
            }
            [constructor] = body.unshiftContainer("body", newConstructor);
          }

          const state = { scope: constructor.scope };
          for (const prop of props) prop.traverse(referenceVisitor, state);

          //

          if (isDerived) {
            const bareSupers = [];
            constructor.traverse(findBareSupers, bareSupers);
            for (const bareSuper of bareSupers) {
              bareSuper.insertAfter(assignments);
            }
          } else {
            constructor.get("body").unshiftContainer("body", assignments);
          }
        }

        for (const prop of props) {
          prop.remove();
        }

        if (computedNodes.length === 0 && afterNodes.length === 0) return;

        if (path.isClassExpression()) {
          path.scope.push({ id: ref });
          path.replaceWith(
            t.assignmentExpression("=", t.cloneNode(ref), path.node),
          );
        } else if (!path.node.id) {
          // Anonymous class declaration
          path.node.id = ref;
        }

        path.insertBefore(computedNodes);
        path.insertAfter(afterNodes);
      },
    },
  };
});
