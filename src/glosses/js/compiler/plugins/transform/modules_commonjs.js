const {
    is,
    js: { compiler: { template, types: t, helper: { pluginUtils: { declare }, simpleAccess: simplifyAccess, moduleTransforms: {
        isModule,
        rewriteModuleStatementsAndPrepareHeader,
        isSideEffectImport,
        buildNamespaceInitStatements,
        ensureStatementsHoisted,
        wrapInterop
    } } } }
} = adone;

export default declare((api, options) => {
    api.assertVersion(7);

    const {
        loose,

        // 'true' for non-mjs files to strictly have .default, instead of having
        // destructuring-like behavior for their properties.
        strictNamespace = false,

        // 'true' for mjs files to strictly have .default, instead of having
        // destructuring-like behavior for their properties.
        mjsStrictNamespace = true,
        allowTopLevelThis,
        strict,
        strictMode,
        noInterop,
        lazy = false,
        // Defaulting to 'true' for now. May change before 7.x major.
        allowCommonJSExports = true
    } = options;

    if (
        !is.boolean(lazy) &&
        !is.function(lazy) &&
        (!is.array(lazy) || !lazy.every((item) => is.string(item)))
    ) {
        throw new Error(".lazy must be a boolean, array of strings, or a function");
    }

    if (!is.boolean(strictNamespace)) {
        throw new Error(".strictNamespace must be a boolean, or undefined");
    }
    if (!is.boolean(mjsStrictNamespace)) {
        throw new Error(".mjsStrictNamespace must be a boolean, or undefined");
    }

    const getAssertion = (localName) => template.expression.ast`
    (function(){
      throw new Error(
        "The CommonJS '" + "${localName}" + "' variable is not available in ES6 modules." +
        "Consider setting setting sourceType:script or sourceType:unambiguous in your " +
        "Babel config for this file.");
    })()
  `;

    const moduleExportsVisitor = {
        ReferencedIdentifier(path) {
            const localName = path.node.name;
            if (localName !== "module" && localName !== "exports") {
                return; 
            }

            const localBinding = path.scope.getBinding(localName);
            const rootBinding = this.scope.getBinding(localName);

            if (
                // redeclared in this scope
                rootBinding !== localBinding ||
                (path.parentPath.isObjectProperty({ value: path.node }) &&
                    path.parentPath.parentPath.isObjectPattern()) ||
                path.parentPath.isAssignmentExpression({ left: path.node }) ||
                path.isAssignmentExpression({ left: path.node })
            ) {
                return;
            }

            path.replaceWith(getAssertion(localName));
        },

        AssignmentExpression(path) {
            const left = path.get("left");
            if (left.isIdentifier()) {
                const localName = path.node.name;
                if (localName !== "module" && localName !== "exports") {
                    return; 
                }

                const localBinding = path.scope.getBinding(localName);
                const rootBinding = this.scope.getBinding(localName);

                // redeclared in this scope
                if (rootBinding !== localBinding) {
                    return; 
                }

                const right = path.get("right");
                right.replaceWith(
                    t.sequenceExpression([right.node, getAssertion(localName)]),
                );
            } else if (left.isPattern()) {
                const ids = left.getOuterBindingIdentifiers();
                const localName = Object.keys(ids).filter((localName) => {
                    if (localName !== "module" && localName !== "exports") {
                        return false; 
                    }

                    return (
                        this.scope.getBinding(localName) ===
                        path.scope.getBinding(localName)
                    );
                })[0];

                if (localName) {
                    const right = path.get("right");
                    right.replaceWith(
                        t.sequenceExpression([right.node, getAssertion(localName)]),
                    );
                }
            }
        }
    };

    return {
        name: "transform-modules-commonjs",

        visitor: {
            Program: {
                exit(path, state) {
                    if (!isModule(path)) {
                        return; 
                    }

                    // Rename the bindings auto-injected into the scope so there is no
                    // risk of conflict between the bindings.
                    path.scope.rename("exports");
                    path.scope.rename("module");
                    path.scope.rename("require");
                    path.scope.rename("__filename");
                    path.scope.rename("__dirname");

                    // Rewrite references to 'module' and 'exports' to throw exceptions.
                    // These objects are specific to CommonJS and are not available in
                    // real ES6 implementations.
                    if (!allowCommonJSExports) {
                        simplifyAccess(path, new Set(["module", "exports"]));
                        path.traverse(moduleExportsVisitor, {
                            scope: path.scope
                        });
                    }

                    let moduleName = this.getModuleName();
                    if (moduleName) {
                        moduleName = t.stringLiteral(moduleName); 
                    }

                    const { meta, headers } = rewriteModuleStatementsAndPrepareHeader(
                        path,
                        {
                            exportName: "exports",
                            loose,
                            strict,
                            strictMode,
                            allowTopLevelThis,
                            noInterop,
                            lazy,
                            esNamespaceOnly:
                                is.string(state.filename) &&
                                    /\.mjs$/.test(state.filename)
                                    ? mjsStrictNamespace
                                    : strictNamespace
                        },
                    );

                    for (const [source, metadata] of meta.source) {
                        const loadExpr = t.callExpression(t.identifier("require"), [
                            t.stringLiteral(source)
                        ]);

                        let header;
                        if (isSideEffectImport(metadata)) {
                            if (metadata.lazy) {
                                throw new Error("Assertion failure"); 
                            }

                            header = t.expressionStatement(loadExpr);
                        } else {
                            const init =
                                wrapInterop(path, loadExpr, metadata.interop) || loadExpr;

                            if (metadata.lazy) {
                                header = template.ast`
                  function ${metadata.name}() {
                    const data = ${init};
                    ${metadata.name} = function(){ return data; };
                    return data;
                  }
                `;
                            } else {
                                header = template.ast`
                  var ${metadata.name} = ${init};
                `;
                            }
                        }
                        header.loc = metadata.loc;

                        headers.push(header);
                        headers.push(
                            ...buildNamespaceInitStatements(meta, metadata, loose),
                        );
                    }

                    ensureStatementsHoisted(headers);
                    path.unshiftContainer("body", headers);
                }
            }
        }
    };
});
