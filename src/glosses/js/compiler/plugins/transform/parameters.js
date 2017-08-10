const { js: { compiler: { types: t, template, traverse: { visitors }, helpers: { callDelegate, getFunctionArity } } } } = adone;

export const destructuringVisitor = {
    Function(path) {
        const params = path.get("params");

        // If there's a rest param, no need to loop through it. Also, we need to
        // hoist one more level to get `declar` at the right spot.
        const hoistTweak = t.isRestElement(params[params.length - 1]) ? 1 : 0;
        const outputParamsLength = params.length - hoistTweak;

        for (let i = 0; i < outputParamsLength; i++) {
            const param = params[i];
            if (param.isArrayPattern() || param.isObjectPattern()) {
                const uid = path.scope.generateUidIdentifier("ref");

                const declar = t.variableDeclaration("let", [
                    t.variableDeclarator(param.node, uid)
                ]);
                declar._blockHoist = outputParamsLength - i;

                path.ensureBlock();
                path.get("body").unshiftContainer("body", declar);

                param.replaceWith(uid);
            }
        }
    }
};

const buildDefaultParam = template(`
  let VARIABLE_NAME =
    ARGUMENTS.length > ARGUMENT_KEY && ARGUMENTS[ARGUMENT_KEY] !== undefined ?
      ARGUMENTS[ARGUMENT_KEY]
    :
      DEFAULT_VALUE;
`);

const buildCutOff = template(`
  let $0 = $1[$2];
`);

const hasDefaults = (node) => {
    for (const param of (node.params)) {
        if (!t.isIdentifier(param)) {
            return true;
        }
    }
    return false;
};

const isSafeBinding = (scope, node) => {
    if (!scope.hasOwnBinding(node.name)) {
        return true;
    }
    const { kind } = scope.getOwnBinding(node.name);
    return kind === "param" || kind === "local";
};

const iifeVisitor = {
    ReferencedIdentifier(path, state) {
        const { scope, node } = path;
        if (node.name === "eval" || !isSafeBinding(scope, node)) {
            state.iife = true;
            path.stop();
        }
    },

    Scope(path) {
        // different bindings
        path.skip();
    }
};

const defVisitor = {
    Function(path) {
        const { node, scope } = path;
        if (!hasDefaults(node)) {
            return;
        }

        // ensure it's a block, useful for arrow functions
        path.ensureBlock();

        const state = {
            iife: false,
            scope
        };

        const body = [];

        //
        const argsIdentifier = t.identifier("arguments");
        argsIdentifier._shadowedFunctionLiteral = path;

        // push a default parameter definition
        const pushDefNode = (left, right, i) => {
            const defNode = buildDefaultParam({
                VARIABLE_NAME: left,
                DEFAULT_VALUE: right,
                ARGUMENT_KEY: t.numericLiteral(i),
                ARGUMENTS: argsIdentifier
            });
            defNode._blockHoist = node.params.length - i;
            body.push(defNode);
        };

        //
        const lastNonDefaultParam = getFunctionArity(node);

        //
        const params = path.get("params");
        for (let i = 0; i < params.length; i++) {
            const param = params[i];

            if (!param.isAssignmentPattern()) {
                if (!state.iife && !param.isIdentifier()) {
                    param.traverse(iifeVisitor, state);
                }

                continue;
            }

            const left = param.get("left");
            const right = param.get("right");

            //
            if (i >= lastNonDefaultParam || left.isPattern()) {
                const placeholder = scope.generateUidIdentifier("x");
                placeholder._isDefaultPlaceholder = true;
                node.params[i] = placeholder;
            } else {
                node.params[i] = left.node;
            }

            //
            if (!state.iife) {
                if (right.isIdentifier() && !isSafeBinding(scope, right.node)) {
                    // the right hand side references a parameter
                    state.iife = true;
                } else {
                    right.traverse(iifeVisitor, state);
                }
            }

            pushDefNode(left.node, right.node, i);
        }

        // add declarations for trailing parameters
        for (let i = lastNonDefaultParam + 1; i < node.params.length; i++) {
            const param = node.params[i];
            if (param._isDefaultPlaceholder) {
                continue;
            }

            const declar = buildCutOff(param, argsIdentifier, t.numericLiteral(i));
            declar._blockHoist = node.params.length - i;
            body.push(declar);
        }

        // we need to cut off all trailing parameters
        node.params = node.params.slice(0, lastNonDefaultParam);

        if (state.iife) {
            body.push(callDelegate(path, scope));
            path.set("body", t.blockStatement(body));
        } else {
            path.get("body").unshiftContainer("body", body);
        }
    }
};


const buildRest = template(`
  for (var LEN = ARGUMENTS.length,
           ARRAY = Array(ARRAY_LEN),
           KEY = START;
       KEY < LEN;
       KEY++) {
    ARRAY[ARRAY_KEY] = ARGUMENTS[KEY];
  }
`);

const restIndex = template(`
  ARGUMENTS.length <= INDEX ? undefined : ARGUMENTS[INDEX]
`);

const restIndexImpure = template(`
  REF = INDEX, ARGUMENTS.length <= REF ? undefined : ARGUMENTS[REF]
`);

const restLength = template(`
  ARGUMENTS.length <= OFFSET ? 0 : ARGUMENTS.length - OFFSET
`);

const memberExpressionOptimisationVisitor = {
    Scope(path, state) {
        // check if this scope has a local binding that will shadow the rest parameter
        if (!path.scope.bindingIdentifierEquals(state.name, state.outerBinding)) {
            path.skip();
        }
    },

    Flow(path) {
        // Do not skip TypeCastExpressions as the contain valid non flow code
        if (path.isTypeCastExpression()) {
            return;
        }
        // don't touch reference in type annotations
        path.skip();
    },

    "Function|ClassProperty"(path, state) {
        // Detect whether any reference to rest is contained in nested functions to
        // determine if deopt is necessary.
        const oldNoOptimise = state.noOptimise;
        state.noOptimise = true;
        path.traverse(memberExpressionOptimisationVisitor, state);
        state.noOptimise = oldNoOptimise;

        // Skip because optimizing references to rest would refer to the `arguments`
        // of the nested function.
        path.skip();
    },

    ReferencedIdentifier(path, state) {
        const { node } = path;

        // we can't guarantee the purity of arguments
        if (node.name === "arguments") {
            state.deopted = true;
        }

        // is this a referenced identifier and is it referencing the rest parameter?
        if (node.name !== state.name) {
            return;
        }

        if (state.noOptimise) {
            state.deopted = true;
        } else {
            const { parentPath } = path;

            // Is this identifier the right hand side of a default parameter?
            if (parentPath.listKey === "params" && parentPath.key < state.offset) {
                return;
            }

            // ex: `args[0]`
            // ex: `args.whatever`
            if (parentPath.isMemberExpression({ object: node })) {
                const grandparentPath = parentPath.parentPath;

                const argsOptEligible = !state.deopted && !(
                    // ex: `args[0] = "whatever"`
                    (
                        grandparentPath.isAssignmentExpression() &&
                        parentPath.node === grandparentPath.node.left
                    ) ||

                    // ex: `[args[0]] = ["whatever"]`
                    grandparentPath.isLVal() ||

                    // ex: `for (rest[0] in this)`
                    // ex: `for (rest[0] of this)`
                    grandparentPath.isForXStatement() ||

                    // ex: `++args[0]`
                    // ex: `args[0]--`
                    grandparentPath.isUpdateExpression() ||

                    // ex: `delete args[0]`
                    grandparentPath.isUnaryExpression({ operator: "delete" }) ||

                    // ex: `args[0]()`
                    // ex: `new args[0]()`
                    // ex: `new args[0]`
                    (
                        (
                            grandparentPath.isCallExpression() ||
                            grandparentPath.isNewExpression()
                        ) &&
                        parentPath.node === grandparentPath.node.callee
                    )
                );

                if (argsOptEligible) {
                    if (parentPath.node.computed) {
                        // if we know that this member expression is referencing a number then
                        // we can safely optimise it
                        if (parentPath.get("property").isBaseType("number")) {
                            state.candidates.push({ cause: "indexGetter", path });
                            return;
                        }
                    } else if (parentPath.node.property.name === "length") { // args.length
                        state.candidates.push({ cause: "lengthGetter", path });
                        return;
                    }
                }
            }

            // we can only do these optimizations if the rest variable would match
            // the arguments exactly
            // optimise single spread args in calls
            // ex: fn(...args)
            if (state.offset === 0 && parentPath.isSpreadElement()) {
                const call = parentPath.parentPath;
                if (call.isCallExpression() && call.node.arguments.length === 1) {
                    state.candidates.push({ cause: "argSpread", path });
                    return;
                }
            }

            state.references.push(path);
        }
    },

    /**
     * Deopt on use of a binding identifier with the same name as our rest param.
     *
     * See https://github.com/babel/babel/issues/2091
     */

    BindingIdentifier({ node }, state) {
        if (node.name === state.name) {
            state.deopted = true;
        }
    }
};

const hasRest = (node) => t.isRestElement(node.params[node.params.length - 1]);

const optimiseIndexGetter = (path, argsId, offset) => {
    let index;

    if (t.isNumericLiteral(path.parent.property)) {
        index = t.numericLiteral(path.parent.property.value + offset);
    } else if (offset === 0) {
        // Avoid unnecessary '+ 0'
        index = path.parent.property;
    } else {
        index = t.binaryExpression("+", path.parent.property, t.numericLiteral(offset));
    }

    const { scope } = path;
    if (!scope.isPure(index)) {
        const temp = scope.generateUidIdentifierBasedOnNode(index);
        scope.push({ id: temp, kind: "var" });
        path.parentPath.replaceWith(restIndexImpure({
            ARGUMENTS: argsId,
            INDEX: index,
            REF: temp
        }));
    } else {
        path.parentPath.replaceWith(restIndex({
            ARGUMENTS: argsId,
            INDEX: index
        }));
    }
};

const optimiseLengthGetter = (path, argsId, offset) => {
    if (offset) {
        path.parentPath.replaceWith(restLength({
            ARGUMENTS: argsId,
            OFFSET: t.numericLiteral(offset)
        }));
    } else {
        path.replaceWith(argsId);
    }
};

const restVisitor = {
    Function(path) {
        const { node, scope } = path;
        if (!hasRest(node)) {
            return;
        }

        const rest = node.params.pop().argument;

        const argsId = t.identifier("arguments");

        // otherwise `arguments` will be remapped in arrow functions
        argsId._shadowedFunctionLiteral = path;

        // check and optimise for extremely common cases
        const state = {
            references: [],
            offset: node.params.length,

            argumentsNode: argsId,
            outerBinding: scope.getBindingIdentifier(rest.name),

            // candidate member expressions we could optimise if there are no other references
            candidates: [],

            // local rest binding name
            name: rest.name,

            /*
            It may be possible to optimize the output code in certain ways, such as
            not generating code to initialize an array (perhaps substituting direct
            references to arguments[i] or arguments.length for reads of the
            corresponding rest parameter property) or positioning the initialization
            code so that it may not have to execute depending on runtime conditions.
      
            This property tracks eligibility for optimization. "deopted" means give up
            and don't perform optimization. For example, when any of rest's elements /
            properties is assigned to at the top level, or referenced at all in a
            nested function.
            */
            deopted: false
        };

        path.traverse(memberExpressionOptimisationVisitor, state);

        // There are only "shorthand" references
        if (!state.deopted && !state.references.length) {
            for (const { path, cause } of (state.candidates: Array)) {
                switch (cause) {
                    case "indexGetter":
                        optimiseIndexGetter(path, argsId, state.offset);
                        break;
                    case "lengthGetter":
                        optimiseLengthGetter(path, argsId, state.offset);
                        break;
                    default:
                        path.replaceWith(argsId);
                }
            }
            return;
        }

        state.references = state.references.concat(
            state.candidates.map(({ path }) => path)
        );

        // deopt shadowed functions as transforms like regenerator may try touch the allocation loop
        state.deopted = state.deopted || Boolean(node.shadow);

        const start = t.numericLiteral(node.params.length);
        const key = scope.generateUidIdentifier("key");
        const len = scope.generateUidIdentifier("len");

        let arrKey = key;
        let arrLen = len;
        if (node.params.length) {
            // this method has additional params, so we need to subtract
            // the index of the current argument position from the
            // position in the array that we want to populate
            arrKey = t.binaryExpression("-", key, start);

            // we need to work out the size of the array that we're
            // going to store all the rest parameters
            //
            // we need to add a check to avoid constructing the array
            // with <0 if there are less arguments than params as it'll
            // cause an error
            arrLen = t.conditionalExpression(
                t.binaryExpression(">", len, start),
                t.binaryExpression("-", len, start),
                t.numericLiteral(0)
            );
        }

        const loop = buildRest({
            ARGUMENTS: argsId,
            ARRAY_KEY: arrKey,
            ARRAY_LEN: arrLen,
            START: start,
            ARRAY: rest,
            KEY: key,
            LEN: len
        });

        if (state.deopted) {
            loop._blockHoist = node.params.length + 1;
            node.body.body.unshift(loop);
        } else {
            // perform allocation at the lowest common ancestor of all references
            loop._blockHoist = 1;

            let target = path.getEarliestCommonAncestorFrom(state.references).getStatementParent();

            // don't perform the allocation inside a loop
            target.findParent((path) => {
                if (path.isLoop()) {
                    target = path;
                } else {
                    // Stop crawling up if this is a function.
                    return path.isFunction();
                }
            });

            target.insertBefore(loop);
        }
    }
};

export default function () {
    return {
        visitor: visitors.merge([{
            ArrowFunctionExpression(path) {
                // default/rest visitors require access to `arguments`
                const params = path.get("params");
                for (const param of params) {
                    if (param.isRestElement() || param.isAssignmentPattern()) {
                        path.arrowFunctionToShadowed();
                        break;
                    }
                }
            }
        }, destructuringVisitor, restVisitor, defVisitor])
    };
}
