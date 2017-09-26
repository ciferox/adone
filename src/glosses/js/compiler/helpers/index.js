import helpers from "./common_helpers";

const {
    is,
    js: { compiler: { traverse, types: t } }
} = adone;

adone.lazify({
    getFunctionArity: "./get_function_arity",
    functionName: "./function_name",
    remapAsyncToGenerator: "./remap_async_to_generator",
    callDelegate: "./call_delegate",
    hoistVariables: "./hoist_variables",
    // explodeAssignableExpression: "./explode_assignable_expression",
    // builderBinaryAssignmentOperatorVisitor: "./builder_binary_assignment_operator_visitor",
    optimiseCallExpression: "./optimise_call_expression",
    ReplaceSupers: "./replace_supers",
    defineMap: "./define_map",
    wrapFunction: "./wrap_function",
    // builderReactJsx: "./builder_react_jsx",
    moduleTransforms: "./module_transforms",
    annotateAsPure: "./annotate_as_pure"
}, exports, require);


const makePath = function (path) {
    const parts = [];

    for (; path.parentPath; path = path.parentPath) {
        parts.push(path.key);
        if (path.inList) { 
            parts.push(path.listKey); 
        }
    }

    return parts.reverse().join(".");
};

/**
 * Given a file AST for a given helper, get a bunch of metadata about it so that Babel can quickly render
 * the helper is whatever context it is needed in.
 */
const getHelperMetadata = function (file) {
    const globals = new Set();
    const localBindingNames = new Set();

    let exportName;
    let exportPath;
    const exportBindingAssignments = [];

    traverse(file, {
        ImportDeclaration(child) {
            throw child.buildCodeFrameError("Helpers may not import anything.");
        },
        ExportDefaultDeclaration(child) {
            const decl = child.get("declaration");

            if (decl.isFunctionDeclaration()) {
                if (!decl.node.id) {
                    throw decl.buildCodeFrameError(
                        "Helpers should give names to their exported func declaration",
                    );
                }

                exportName = decl.node.id.name;
            }
            exportPath = makePath(child);
        },
        ExportAllDeclaration(child) {
            throw child.buildCodeFrameError("Helpers can only export default");
        },
        ExportNamedDeclaration(child) {
            throw child.buildCodeFrameError("Helpers can only export default");
        },
        Statement(child) {
            if (child.isModuleDeclaration()) {
                return; 
            }

            child.skip();
        }
    });

    traverse(file, {
        Program(path) {
            const bindings = path.scope.getAllBindings();

            Object.keys(bindings).forEach((name) => {
                if (name === exportName) { 
                    return;
                }

                localBindingNames.add(name);
            });
        },
        ReferencedIdentifier(child) {
            const name = child.node.name;
            const binding = child.scope.getBinding(name);

            if (!binding) { 
                globals.add(name); 
            }
        },
        AssignmentExpression(child) {
            const left = child.get("left");

            if (!(exportName in left.getBindingIdentifiers())) { 
                return; 
            }

            if (!left.isIdentifier()) {
                throw left.buildCodeFrameError(
                    "Only simple assignments to exports are allowed in helpers",
                );
            }

            const binding = child.scope.getBinding(exportName);

            if (binding && binding.scope.path.isProgram()) {
                exportBindingAssignments.push(makePath(child));
            }
        }
    });

    if (!exportPath) { 
        throw new Error("Helpers must default-export something."); 
    }

    // Process these in reverse so that mutating the references does not invalidate any later paths in
    // the list.
    exportBindingAssignments.reverse();

    return {
        globals: Array.from(globals),
        localBindingNames: Array.from(localBindingNames),
        exportBindingAssignments,
        exportPath,
        exportName
    };
};

/**
 * Given a helper AST and information about how it will be used, update the AST to match the usage.
 */
const permuteHelperAST = function (file, metadata, id, localBindings) {
    if (localBindings && !id) {
        throw new Error("Unexpected local bindings for module-based helpers.");
    }

    if (!id) {
        return; 
    }

    const {
        localBindingNames,
        exportBindingAssignments,
        exportPath,
        exportName
    } = metadata;

    const toRename = {};
    const bindings = new Set(localBindings || []);
    localBindingNames.forEach((name) => {
        let newName = name;
        while (bindings.has(newName)) { 
            newName = `_${newName}`; 
        }

        if (newName !== name) { 
            toRename[name] = newName; 
        }
    });

    if (id.type === "Identifier" && exportName !== id.name) {
        toRename[exportName] = id.name;
    }

    traverse(file, {
        Program(path) {
            const exp = path.get(exportPath);
            const decl = exp.get("declaration");
            if (id.type === "Identifier") {
                if (decl.isFunctionDeclaration()) {
                    exp.replaceWith(decl);
                } else {
                    exp.replaceWith(
                        t.variableDeclaration("var", [t.variableDeclarator(id, decl.node)]),
                    );
                }
            } else if (id.type === "MemberExpression") {
                if (decl.isFunctionDeclaration()) {
                    exportBindingAssignments.forEach((assignPath) => {
                        const assign = path.get(assignPath);
                        assign.replaceWith(t.assignmentExpression("=", id, assign.node));
                    });
                    exp.replaceWith(decl);
                    path.pushContainer(
                        "body",
                        t.assignmentExpression("=", id, t.identifier(exportName)),
                    );
                } else {
                    exp.replaceWith(t.assignmentExpression("=", id, decl.node));
                }
            } else {
                throw new Error("Unexpected helper format.");
            }

            Object.keys(toRename).forEach((name) => {
                path.scope.rename(name, toRename[name]);
            });

            // We only use "traverse" for all the handy scoping helpers, so we can stop immediately without
            // actually doing the traversal.
            path.stop();
        }
    });
};

const helperData = {};
const loadHelper = function (name) {
    if (!helperData[name]) {
        if (!helpers[name]) { 
            throw new ReferenceError(`Unknown helper ${name}`); 
        }

        const fn = () => {
            const ast = helpers[name]();
            return t.file(t.program(is.array(ast) ? ast : [ast]));
        };

        const metadata = getHelperMetadata(fn());

        helperData[name] = function (id, localBindings) {
            const file = fn();
            permuteHelperAST(file, metadata, id, localBindings);

            return {
                nodes: file.program.body,
                globals: metadata.globals
            };
        };
    }

    return helperData[name];
};

export const get = function (name, id?, localBindings?: Array) {
    const helper = loadHelper(name);
    return helper(id, localBindings);
};

export const list = Object.keys(helpers).map((name) => name.replace(/^_/, "")).filter((name) => name !== "__esModule");
