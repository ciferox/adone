const { assert, is, js: { compiler: { types: t, } } } = adone;

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

const m = require("private").makeAccessor();

const opaqueTypes = {
    FunctionExpression: true,
    ArrowFunctionExpression: true
};

// These types potentially have side effects regardless of what side
// effects their subexpressions have.
const sideEffectTypes = {
    CallExpression: true, // Anything could happen!
    ForInStatement: true, // Modifies the key variable.
    UnaryExpression: true, // Think delete.
    BinaryExpression: true, // Might invoke .toString() or .valueOf().
    AssignmentExpression: true, // Side-effecting by definition.
    UpdateExpression: true, // Updates are essentially assignments.
    NewExpression: true // Similar to CallExpression.
};

// These types are the direct cause of all leaps in control flow.
const leapTypes = {
    YieldExpression: true,
    BreakStatement: true,
    ContinueStatement: true,
    ReturnStatement: true,
    ThrowStatement: true
};

// All leap types are also side effect types.
for (const type in leapTypes) {
    if (hasOwn.call(leapTypes, type)) {
        sideEffectTypes[type] = leapTypes[type];
    }
}

const makePredicate = (propertyName, knownTypes) => {
    const predicate = (node) => {
        t.assertNode(node);

        const meta = m(node);
        if (hasOwn.call(meta, propertyName)) {
            return meta[propertyName];
        }

        // Certain types are "opaque," which means they have no side
        // effects or leaps and we don't care about their subexpressions.
        if (hasOwn.call(opaqueTypes, node.type)) {
            return meta[propertyName] = false;
        }

        if (hasOwn.call(knownTypes, node.type)) {
            return meta[propertyName] = true;
        }

        return meta[propertyName] = onlyChildren(node);
    };

    const onlyChildren = (node) => {
        t.assertNode(node);

        // Assume no side effects until we find out otherwise.
        let result = false;

        const check = (child) => {
            if (result) {
                // Do nothing.
            } else if (is.array(child)) {
                child.some(check);
            } else if (t.isNode(child)) {
                assert.strictEqual(result, false);
                result = predicate(child);
            }
            return result;
        };

        const keys = t.VISITOR_KEYS[node.type];
        if (keys) {
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const child = node[key];
                check(child);
            }
        }

        return result;
    };

    predicate.onlyChildren = onlyChildren;

    return predicate;
};

const meta = {
    hasSideEffects: makePredicate("hasSideEffects", sideEffectTypes),
    containsLeap: makePredicate("containsLeap", leapTypes)
}

const util = {
    runtimeProperty(name) {
        return t.memberExpression(
            t.identifier("regeneratorRuntime"),
            t.identifier(name),
            false
        );
    },

    isReference(path) {
        return path.isReferenced() || path.parentPath.isAssignmentExpression({ left: path.node });
    },

    replaceWithOrRemove(path, replacement) {
        if (replacement) {
            path.replaceWith(replacement);
        } else {
            path.remove();
        }
    }
};

// this function converts a shorthand object generator method into a normal
// (non-shorthand) object property which is a generator function expression. for
// example, this:
//
//  var foo = {
//    *bar(baz) { return 5; }
//  }
//
// should be replaced with:
//
//  var foo = {
//    bar: function*(baz) { return 5; }
//  }
//
// to do this, it clones the parameter array and the body of the object generator
// method into a new FunctionExpression.
//
// this method can be passed any Function AST node path, and it will return
// either:
//   a) the path that was passed in (iff the path did not need to be replaced) or
//   b) the path of the new FunctionExpression that was created as a replacement
//     (iff the path did need to be replaced)
//
// In either case, though, the caller can count on the fact that the return value
// is a Function AST node path.
//
// If this function is called with an AST node path that is not a Function (or with an
// argument that isn't an AST node path), it will throw an error.
const replaceShorthandObjectMethod = (path) => {
    if (!path.node || !t.isFunction(path.node)) {
        throw new Error("replaceShorthandObjectMethod can only be called on Function AST node paths.");
    }

    // this function only replaces shorthand object methods (called ObjectMethod
    // in Babel-speak).
    if (!t.isObjectMethod(path.node)) {
        return path;
    }

    // this function only replaces generators.
    if (!path.node.generator) {
        return path;
    }

    const parameters = path.node.params.map((param) => {
        return t.cloneDeep(param);
    });

    const functionExpression = t.functionExpression(
        null, // id
        parameters, // params
        t.cloneDeep(path.node.body), // body
        path.node.generator,
        path.node.async
    );

    util.replaceWithOrRemove(path,
        t.objectProperty(
            t.cloneDeep(path.node.key), // key
            functionExpression, //value
            path.node.computed, // computed
            false // shorthand
        )
    );

    // path now refers to the ObjectProperty AST node path, but we want to return a
    // Function AST node path for the function expression we created. we know that
    // the FunctionExpression we just created is the value of the ObjectProperty,
    // so return the "value" path off of this path.
    return path.get("value");
};

// Offsets into this.listing that could be used as targets for branches or
// jumps are represented as numeric Literal nodes. This representation has
// the amazingly convenient benefit of allowing the exact value of the
// location to be determined at any time, even after generating code that
// refers to the location.
const loc = () => t.numericLiteral(-1);

const getDeclError = (node) => new Error(`all declarations should have been transformed into assignments before the Exploder began its work: ${JSON.stringify(node)}`);

const catchParamVisitor = {
    Identifier(path, state) {
        if (path.node.name === state.catchParamName && util.isReference(path)) {
            util.replaceWithOrRemove(path, state.safeParam);
        }
    },

    Scope(path, state) {
        if (path.scope.hasOwnBinding(state.catchParamName)) {
            // Don't descend into nested scopes that shadow the catch
            // parameter with their own declarations.
            path.skip();
        }
    }
};

const isValidCompletion = (record) => {
    const type = record.type;

    if (type === "normal") {
        return !hasOwn.call(record, "target");
    }

    if (type === "break" ||
        type === "continue") {
        return !hasOwn.call(record, "value")
            && t.isLiteral(record.target);
    }

    if (type === "return" ||
        type === "throw") {
        return hasOwn.call(record, "value")
            && !hasOwn.call(record, "target");
    }

    return false;
};

class Emitter {
    constructor(contextId) {
        assert.ok(this instanceof Emitter);
        t.assertIdentifier(contextId);

        // Used to generate unique temporary names.
        this.nextTempId = 0;

        // In order to make sure the context object does not collide with
        // anything in the local scope, we might have to rename it, so we
        // refer to it symbolically instead of just assuming that it will be
        // called "context".
        this.contextId = contextId;

        // An append-only list of Statements that grows each time this.emit is
        // called.
        this.listing = [];

        // A sparse array whose keys correspond to locations in this.listing
        // that have been marked as branch/jump targets.
        this.marked = [true];

        // The last location will be marked when this.getDispatchLoop is
        // called.
        this.finalLoc = loc();

        // A list of all TryEntry statements emitted.
        this.tryEntries = [];

        // Each time we evaluate the body of a loop, we tell this.leapManager
        // to enter a nested loop context that determines the meaning of break
        // and continue statements therein.
        this.leapManager = new LeapManager(this);
    }

    // Sets the exact value of the given location to the offset of the next
    // Statement emitted.
    mark(loc) {
        t.assertLiteral(loc);
        const index = this.listing.length;
        if (loc.value === -1) {
            loc.value = index;
        } else {
            // Locations can be marked redundantly, but their values cannot change
            // once set the first time.
            assert.strictEqual(loc.value, index);
        }
        this.marked[index] = true;
        return loc;
    }

    emit(node) {
        if (t.isExpression(node)) {
            node = t.expressionStatement(node);
        }

        t.assertStatement(node);
        this.listing.push(node);
    }

    // Shorthand for emitting assignment statements. This will come in handy
    // for assignments to temporary variables.
    emitAssign(lhs, rhs) {
        this.emit(this.assign(lhs, rhs));
        return lhs;
    }

    // Shorthand for an assignment statement.
    assign(lhs, rhs) {
        return t.expressionStatement(
            t.assignmentExpression("=", lhs, rhs));
    }

    // Convenience function for generating expressions like context.next,
    // context.sent, and context.rval.
    contextProperty(name, computed) {
        return t.memberExpression(
            this.contextId,
            computed ? t.stringLiteral(name) : t.identifier(name),
            Boolean(computed)
        );
    }

    // Shorthand for setting context.rval and jumping to `context.stop()`.
    stop(rval) {
        if (rval) {
            this.setReturnValue(rval);
        }

        this.jump(this.finalLoc);
    }

    setReturnValue(valuePath) {
        t.assertExpression(valuePath.value);

        this.emitAssign(
            this.contextProperty("rval"),
            this.explodeExpression(valuePath)
        );
    }

    clearPendingException(tryLoc, assignee) {
        t.assertLiteral(tryLoc);

        const catchCall = t.callExpression(
            this.contextProperty("catch", true),
            [tryLoc]
        );

        if (assignee) {
            this.emitAssign(assignee, catchCall);
        } else {
            this.emit(catchCall);
        }
    }

    // Emits code for an unconditional jump to the given location, even if the
    // exact value of the location is not yet known.
    jump(toLoc) {
        this.emitAssign(this.contextProperty("next"), toLoc);
        this.emit(t.breakStatement());
    }

    // Conditional jump.
    jumpIf(test, toLoc) {
        t.assertExpression(test);
        t.assertLiteral(toLoc);

        this.emit(t.ifStatement(
            test,
            t.blockStatement([
                this.assign(this.contextProperty("next"), toLoc),
                t.breakStatement()
            ])
        ));
    }

    // Conditional jump, with the condition negated.
    jumpIfNot(test, toLoc) {
        t.assertExpression(test);
        t.assertLiteral(toLoc);

        let negatedTest;
        if (t.isUnaryExpression(test) &&
            test.operator === "!") {
            // Avoid double negation.
            negatedTest = test.argument;
        } else {
            negatedTest = t.unaryExpression("!", test);
        }

        this.emit(t.ifStatement(
            negatedTest,
            t.blockStatement([
                this.assign(this.contextProperty("next"), toLoc),
                t.breakStatement()
            ])
        ));
    }

    // Returns a unique MemberExpression that can be used to store and
    // retrieve temporary values. Since the object of the member expression is
    // the context object, which is presumed to coexist peacefully with all
    // other local variables, and since we just increment `nextTempId`
    // monotonically, uniqueness is assured.
    makeTempVar() {
        return this.contextProperty(`t${this.nextTempId++}`);
    }

    getContextFunction(id) {
        return t.functionExpression(
            id || null/*Anonymous*/,
            [this.contextId],
            t.blockStatement([this.getDispatchLoop()]),
            false, // Not a generator anymore!
            false // Nor an expression.
        );
    }

    // Turns this.listing into a loop of the form
    //
    //   while (1) switch (context.next) {
    //   case 0:
    //   ...
    //   case n:
    //     return context.stop();
    //   }
    //
    // Each marked location in this.listing will correspond to one generated
    // case statement.
    getDispatchLoop() {
        const self = this;
        const cases = [];
        let current;

        // If we encounter a break, continue, or return statement in a switch
        // case, we can skip the rest of the statements until the next case.
        let alreadyEnded = false;

        self.listing.forEach((stmt, i) => {
            if (self.marked.hasOwnProperty(i)) {
                cases.push(t.switchCase(
                    t.numericLiteral(i),
                    current = []));
                alreadyEnded = false;
            }

            if (!alreadyEnded) {
                current.push(stmt);
                if (t.isCompletionStatement(stmt)) {
                    alreadyEnded = true;
                }
            }
        });

        // Now that we know how many statements there will be in this.listing,
        // we can finally resolve this.finalLoc.value.
        this.finalLoc.value = this.listing.length;

        cases.push(
            t.switchCase(this.finalLoc, [
                // Intentionally fall through to the "end" case...
            ]),

            // So that the runtime can jump to the final location without having
            // to know its offset, we provide the "end" case as a synonym.
            t.switchCase(t.stringLiteral("end"), [
                // This will check/clear both context.thrown and context.rval.
                t.returnStatement(
                    t.callExpression(this.contextProperty("stop"), [])
                )
            ])
        );

        return t.whileStatement(
            t.numericLiteral(1),
            t.switchStatement(
                t.assignmentExpression(
                    "=",
                    this.contextProperty("prev"),
                    this.contextProperty("next")
                ),
                cases
            )
        );
    }

    getTryLocsList() {
        if (this.tryEntries.length === 0) {
            // To avoid adding a needless [] to the majority of runtime.wrap
            // argument lists, force the caller to handle this case specially.
            return null;
        }

        let lastLocValue = 0;

        return t.arrayExpression(
            this.tryEntries.map((tryEntry) => {
                const thisLocValue = tryEntry.firstLoc.value;
                assert.ok(thisLocValue >= lastLocValue, "try entries out of order");
                lastLocValue = thisLocValue;

                const ce = tryEntry.catchEntry;
                const fe = tryEntry.finallyEntry;

                const locs = [
                    tryEntry.firstLoc,
                    // The null here makes a hole in the array.
                    ce ? ce.firstLoc : null
                ];

                if (fe) {
                    locs[2] = fe.firstLoc;
                    locs[3] = fe.afterLoc;
                }

                return t.arrayExpression(locs);
            })
        );
    }

    // All side effects must be realized in order.

    // If any subexpression harbors a leap, all subexpressions must be
    // neutered of side effects.

    // No destructive modification of AST nodes.

    explode(path, ignoreResult) {
        const node = path.node;
        const self = this;

        t.assertNode(node);

        if (t.isDeclaration(node)) {
            throw getDeclError(node);
        }

        if (t.isStatement(node)) {
            return self.explodeStatement(path);
        }

        if (t.isExpression(node)) {
            return self.explodeExpression(path, ignoreResult);
        }

        switch (node.type) {
            case "Program":
                return path.get("body").map(
                    self.explodeStatement,
                    self
                );

            case "VariableDeclarator":
                throw getDeclError(node);

            // These node types should be handled by their parent nodes
            // (ObjectExpression, SwitchStatement, and TryStatement, respectively).
            case "Property":
            case "SwitchCase":
            case "CatchClause":
                throw new Error(
                    `${node.type} nodes should be handled by their parents`);

            default:
                throw new Error(`unknown Node of type ${JSON.stringify(node.type)}`);
        }
    }

    explodeStatement(path, labelId) {
        const stmt = path.node;
        const self = this;
        let before;
        let after;
        let head;

        t.assertStatement(stmt);

        if (labelId) {
            t.assertIdentifier(labelId);
        } else {
            labelId = null;
        }

        // Explode BlockStatement nodes even if they do not contain a yield,
        // because we don't want or need the curly braces.
        if (t.isBlockStatement(stmt)) {
            path.get("body").forEach((path) => {
                self.explodeStatement(path);
            });
            return;
        }

        if (!meta.containsLeap(stmt)) {
            // Technically we should be able to avoid emitting the statement
            // altogether if !meta.hasSideEffects(stmt), but that leads to
            // confusing generated code (for instance, `while (true) {}` just
            // disappears) and is probably a more appropriate job for a dedicated
            // dead code elimination pass.
            self.emit(stmt);
            return;
        }

        switch (stmt.type) {
            case "ExpressionStatement":
                self.explodeExpression(path.get("expression"), true);
                break;

            case "LabeledStatement":
                after = loc();

                // Did you know you can break from any labeled block statement or
                // control structure? Well, you can! Note: when a labeled loop is
                // encountered, the LabeledEntry created here will immediately
                // enclose a LoopEntry on the leap manager's stack, and both
                // entries will have the same label. Though this works just fine, it
                // may seem a bit redundant. In theory, we could check here to
                // determine if stmt knows how to handle its own label; for example,
                // stmt happens to be a WhileStatement and so we know it's going to
                // establish its own LoopEntry when we explode it (below). Then this
                // LabeledEntry would be unnecessary. Alternatively, we might be
                // tempted not to pass stmt.label down into self.explodeStatement,
                // because we've handled the label here, but that's a mistake because
                // labeled loops may contain labeled continue statements, which is not
                // something we can handle in this generic case. All in all, I think a
                // little redundancy greatly simplifies the logic of this case, since
                // it's clear that we handle all possible LabeledStatements correctly
                // here, regardless of whether they interact with the leap manager
                // themselves. Also remember that labels and break/continue-to-label
                // statements are rare, and all of this logic happens at transform
                // time, so it has no additional runtime cost.
                self.leapManager.withEntry(
                    new LabeledEntry(after, stmt.label),
                    () => {
                        self.explodeStatement(path.get("body"), stmt.label);
                    }
                );

                self.mark(after);

                break;

            case "WhileStatement":
                before = loc();
                after = loc();

                self.mark(before);
                self.jumpIfNot(self.explodeExpression(path.get("test")), after);
                self.leapManager.withEntry(new LoopEntry(after, before, labelId), () => {
                    self.explodeStatement(path.get("body"));
                });
                self.jump(before);
                self.mark(after);

                break;
            case "DoWhileStatement": {
                const first = loc();
                const test = loc();
                after = loc();

                self.mark(first);
                self.leapManager.withEntry(
                    new LoopEntry(after, test, labelId),
                    () => {
                        self.explode(path.get("body"));
                    }
                );
                self.mark(test);
                self.jumpIf(self.explodeExpression(path.get("test")), first);
                self.mark(after);

                break;
            }
            case "ForStatement": {
                head = loc();
                const update = loc();
                after = loc();

                if (stmt.init) {
                    // We pass true here to indicate that if stmt.init is an expression
                    // then we do not care about its result.
                    self.explode(path.get("init"), true);
                }

                self.mark(head);

                if (stmt.test) {
                    self.jumpIfNot(self.explodeExpression(path.get("test")), after);
                } else {
                    // No test means continue unconditionally.
                }

                self.leapManager.withEntry(
                    new LoopEntry(after, update, labelId),
                    () => {
                        self.explodeStatement(path.get("body"));
                    }
                );

                self.mark(update);

                if (stmt.update) {
                    // We pass true here to indicate that if stmt.update is an
                    // expression then we do not care about its result.
                    self.explode(path.get("update"), true);
                }

                self.jump(head);

                self.mark(after);

                break;
            }
            case "TypeCastExpression":
                return self.explodeExpression(path.get("expression"));

            case "ForInStatement": {
                head = loc();
                after = loc();

                const keyIterNextFn = self.makeTempVar();
                self.emitAssign(
                    keyIterNextFn,
                    t.callExpression(
                        util.runtimeProperty("keys"),
                        [self.explodeExpression(path.get("right"))]
                    )
                );

                self.mark(head);

                const keyInfoTmpVar = self.makeTempVar();
                self.jumpIf(
                    t.memberExpression(
                        t.assignmentExpression(
                            "=",
                            keyInfoTmpVar,
                            t.callExpression(keyIterNextFn, [])
                        ),
                        t.identifier("done"),
                        false
                    ),
                    after
                );

                self.emitAssign(
                    stmt.left,
                    t.memberExpression(
                        keyInfoTmpVar,
                        t.identifier("value"),
                        false
                    )
                );

                self.leapManager.withEntry(
                    new LoopEntry(after, head, labelId),
                    () => {
                        self.explodeStatement(path.get("body"));
                    }
                );

                self.jump(head);

                self.mark(after);

                break;
            }
            case "BreakStatement":
                self.emitAbruptCompletion({
                    type: "break",
                    target: self.leapManager.getBreakLoc(stmt.label)
                });

                break;

            case "ContinueStatement":
                self.emitAbruptCompletion({
                    type: "continue",
                    target: self.leapManager.getContinueLoc(stmt.label)
                });

                break;

            case "SwitchStatement": {
                // Always save the discriminant into a temporary variable in case the
                // test expressions overwrite values like context.sent.
                const disc = self.emitAssign(
                    self.makeTempVar(),
                    self.explodeExpression(path.get("discriminant"))
                );

                after = loc();
                const defaultLoc = loc();
                let condition = defaultLoc;
                const caseLocs = [];

                // If there are no cases, .cases might be undefined.
                const cases = stmt.cases || [];

                for (let i = cases.length - 1; i >= 0; --i) {
                    const c = cases[i];
                    t.assertSwitchCase(c);

                    if (c.test) {
                        condition = t.conditionalExpression(
                            t.binaryExpression("===", disc, c.test),
                            caseLocs[i] = loc(),
                            condition
                        );
                    } else {
                        caseLocs[i] = defaultLoc;
                    }
                }

                const discriminant = path.get("discriminant");
                util.replaceWithOrRemove(discriminant, condition);
                self.jump(self.explodeExpression(discriminant));

                self.leapManager.withEntry(
                    new SwitchEntry(after),
                    () => {
                        path.get("cases").forEach((casePath) => {
                            const i = casePath.key;
                            self.mark(caseLocs[i]);

                            casePath.get("consequent").forEach((path) => {
                                self.explodeStatement(path);
                            });
                        });
                    }
                );

                self.mark(after);
                if (defaultLoc.value === -1) {
                    self.mark(defaultLoc);
                    assert.strictEqual(after.value, defaultLoc.value);
                }

                break;
            }
            case "IfStatement": {
                const elseLoc = stmt.alternate && loc();
                after = loc();

                self.jumpIfNot(
                    self.explodeExpression(path.get("test")),
                    elseLoc || after
                );

                self.explodeStatement(path.get("consequent"));

                if (elseLoc) {
                    self.jump(after);
                    self.mark(elseLoc);
                    self.explodeStatement(path.get("alternate"));
                }

                self.mark(after);

                break;
            }
            case "ReturnStatement":
                self.emitAbruptCompletion({
                    type: "return",
                    value: self.explodeExpression(path.get("argument"))
                });

                break;

            case "WithStatement":
                throw new Error("WithStatement not supported in generator functions.");

            case "TryStatement": {
                after = loc();

                const handler = stmt.handler;

                const catchLoc = handler && loc();
                const catchEntry = catchLoc && new CatchEntry(
                    catchLoc,
                    handler.param
                );

                const finallyLoc = stmt.finalizer && loc();
                const finallyEntry = finallyLoc &&
                    new FinallyEntry(finallyLoc, after);

                const tryEntry = new TryEntry(
                    self.getUnmarkedCurrentLoc(),
                    catchEntry,
                    finallyEntry
                );

                self.tryEntries.push(tryEntry);
                self.updateContextPrevLoc(tryEntry.firstLoc);

                self.leapManager.withEntry(tryEntry, () => {
                    self.explodeStatement(path.get("block"));

                    if (catchLoc) {
                        if (finallyLoc) {
                            // If we have both a catch block and a finally block, then
                            // because we emit the catch block first, we need to jump over
                            // it to the finally block.
                            self.jump(finallyLoc);

                        } else {
                            // If there is no finally block, then we need to jump over the
                            // catch block to the fall-through location.
                            self.jump(after);
                        }

                        self.updateContextPrevLoc(self.mark(catchLoc));

                        const bodyPath = path.get("handler.body");
                        const safeParam = self.makeTempVar();
                        self.clearPendingException(tryEntry.firstLoc, safeParam);

                        bodyPath.traverse(catchParamVisitor, {
                            safeParam,
                            catchParamName: handler.param.name
                        });

                        self.leapManager.withEntry(catchEntry, () => {
                            self.explodeStatement(bodyPath);
                        });
                    }

                    if (finallyLoc) {
                        self.updateContextPrevLoc(self.mark(finallyLoc));

                        self.leapManager.withEntry(finallyEntry, () => {
                            self.explodeStatement(path.get("finalizer"));
                        });

                        self.emit(t.returnStatement(t.callExpression(
                            self.contextProperty("finish"),
                            [finallyEntry.firstLoc]
                        )));
                    }
                });

                self.mark(after);

                break;
            }
            case "ThrowStatement":
                self.emit(t.throwStatement(
                    self.explodeExpression(path.get("argument"))
                ));

                break;

            default:
                throw new Error(`unknown Statement of type ${JSON.stringify(stmt.type)}`);
        }
    }

    emitAbruptCompletion(record) {
        if (!isValidCompletion(record)) {
            assert.ok(false, `invalid completion record: ${JSON.stringify(record)}`
            );
        }

        assert.notStrictEqual(record.type, "normal", "normal completions are not abrupt");

        const abruptArgs = [t.stringLiteral(record.type)];

        if (record.type === "break" ||
            record.type === "continue") {
            t.assertLiteral(record.target);
            abruptArgs[1] = record.target;
        } else if (record.type === "return" ||
            record.type === "throw") {
            if (record.value) {
                t.assertExpression(record.value);
                abruptArgs[1] = record.value;
            }
        }

        this.emit(
            t.returnStatement(
                t.callExpression(
                    this.contextProperty("abrupt"),
                    abruptArgs
                )
            )
        );
    }

    // Not all offsets into emitter.listing are potential jump targets. For
    // example, execution typically falls into the beginning of a try block
    // without jumping directly there. This method returns the current offset
    // without marking it, so that a switch case will not necessarily be
    // generated for this offset (I say "not necessarily" because the same
    // location might end up being marked in the process of emitting other
    // statements). There's no logical harm in marking such locations as jump
    // targets, but minimizing the number of switch cases keeps the generated
    // code shorter.
    getUnmarkedCurrentLoc() {
        return t.numericLiteral(this.listing.length);
    }

    // The context.prev property takes the value of context.next whenever we
    // evaluate the switch statement discriminant, which is generally good
    // enough for tracking the last location we jumped to, but sometimes
    // context.prev needs to be more precise, such as when we fall
    // successfully out of a try block and into a finally block without
    // jumping. This method exists to update context.prev to the freshest
    // available location. If we were implementing a full interpreter, we
    // would know the location of the current instruction with complete
    // precision at all times, but we don't have that luxury here, as it would
    // be costly and verbose to set context.prev before every statement.
    updateContextPrevLoc(loc) {
        if (loc) {
            t.assertLiteral(loc);

            if (loc.value === -1) {
                // If an uninitialized location literal was passed in, set its value
                // to the current this.listing.length.
                loc.value = this.listing.length;
            } else {
                // Otherwise assert that the location matches the current offset.
                assert.strictEqual(loc.value, this.listing.length);
            }

        } else {
            loc = this.getUnmarkedCurrentLoc();
        }

        // Make sure context.prev is up to date in case we fell into this try
        // statement without jumping to it. TODO Consider avoiding this
        // assignment when we know control must have jumped here.
        this.emitAssign(this.contextProperty("prev"), loc);
    }

    explodeExpression(path, ignoreResult) {
        const expr = path.node;
        if (expr) {
            t.assertExpression(expr);
        } else {
            return expr;
        }

        const self = this;
        let result; // Used optionally by several cases below.
        let after;

        const finish = (expr) => {
            t.assertExpression(expr);
            if (ignoreResult) {
                self.emit(expr);
            } else {
                return expr;
            }
        };

        // If the expression does not contain a leap, then we either emit the
        // expression as a standalone statement or return it whole.
        if (!meta.containsLeap(expr)) {
            return finish(expr);
        }

        // If any child contains a leap (such as a yield or labeled continue or
        // break statement), then any sibling subexpressions will almost
        // certainly have to be exploded in order to maintain the order of their
        // side effects relative to the leaping child(ren).
        const hasLeapingChildren = meta.containsLeap.onlyChildren(expr);

        // In order to save the rest of explodeExpression from a combinatorial
        // trainwreck of special cases, explodeViaTempVar is responsible for
        // deciding when a subexpression needs to be "exploded," which is my
        // very technical term for emitting the subexpression as an assignment
        // to a temporary variable and the substituting the temporary variable
        // for the original subexpression. Think of exploded view diagrams, not
        // Michael Bay movies. The point of exploding subexpressions is to
        // control the precise order in which the generated code realizes the
        // side effects of those subexpressions.
        const explodeViaTempVar = (tempVar, childPath, ignoreChildResult) => {
            assert.ok(
                !ignoreChildResult || !tempVar,
                "Ignoring the result of a child expression but forcing it to " +
                "be assigned to a temporary variable?"
            );

            let result = self.explodeExpression(childPath, ignoreChildResult);

            if (ignoreChildResult) {
                // Side effects already emitted above.

            } else if (tempVar || (hasLeapingChildren &&
                !t.isLiteral(result))) {
                // If tempVar was provided, then the result will always be assigned
                // to it, even if the result does not otherwise need to be assigned
                // to a temporary variable.  When no tempVar is provided, we have
                // the flexibility to decide whether a temporary variable is really
                // necessary.  Unfortunately, in general, a temporary variable is
                // required whenever any child contains a yield expression, since it
                // is difficult to prove (at all, let alone efficiently) whether
                // this result would evaluate to the same value before and after the
                // yield (see #206).  One narrow case where we can prove it doesn't
                // matter (and thus we do not need a temporary variable) is when the
                // result in question is a Literal value.
                result = self.emitAssign(
                    tempVar || self.makeTempVar(),
                    result
                );
            }
            return result;
        };

        // If ignoreResult is true, then we must take full responsibility for
        // emitting the expression with all its side effects, and we should not
        // return a result.

        switch (expr.type) {
            case "MemberExpression":
                return finish(t.memberExpression(
                    self.explodeExpression(path.get("object")),
                    expr.computed
                        ? explodeViaTempVar(null, path.get("property"))
                        : expr.property,
                    expr.computed
                ));

            case "CallExpression": {
                const calleePath = path.get("callee");
                const argsPath = path.get("arguments");

                let newCallee;
                const newArgs = [];

                let hasLeapingArgs = false;
                argsPath.forEach((argPath) => {
                    hasLeapingArgs = hasLeapingArgs ||
                        meta.containsLeap(argPath.node);
                });

                if (t.isMemberExpression(calleePath.node)) {
                    if (hasLeapingArgs) {
                        // If the arguments of the CallExpression contained any yield
                        // expressions, then we need to be sure to evaluate the callee
                        // before evaluating the arguments, but if the callee was a member
                        // expression, then we must be careful that the object of the
                        // member expression still gets bound to `this` for the call.

                        const newObject = explodeViaTempVar(
                            // Assign the exploded callee.object expression to a temporary
                            // variable so that we can use it twice without reevaluating it.
                            self.makeTempVar(),
                            calleePath.get("object")
                        );

                        const newProperty = calleePath.node.computed
                            ? explodeViaTempVar(null, calleePath.get("property"))
                            : calleePath.node.property;

                        newArgs.unshift(newObject);

                        newCallee = t.memberExpression(
                            t.memberExpression(
                                newObject,
                                newProperty,
                                calleePath.node.computed
                            ),
                            t.identifier("call"),
                            false
                        );

                    } else {
                        newCallee = self.explodeExpression(calleePath);
                    }

                } else {
                    newCallee = explodeViaTempVar(null, calleePath);

                    if (t.isMemberExpression(newCallee)) {
                        // If the callee was not previously a MemberExpression, then the
                        // CallExpression was "unqualified," meaning its `this` object
                        // should be the global object. If the exploded expression has
                        // become a MemberExpression (e.g. a context property, probably a
                        // temporary variable), then we need to force it to be unqualified
                        // by using the (0, object.property)(...) trick; otherwise, it
                        // will receive the object of the MemberExpression as its `this`
                        // object.
                        newCallee = t.sequenceExpression([
                            t.numericLiteral(0),
                            newCallee
                        ]);
                    }
                }

                argsPath.forEach((argPath) => {
                    newArgs.push(explodeViaTempVar(null, argPath));
                });

                return finish(t.callExpression(
                    newCallee,
                    newArgs
                ));
            }
            case "NewExpression":
                return finish(t.newExpression(
                    explodeViaTempVar(null, path.get("callee")),
                    path.get("arguments").map((argPath) => {
                        return explodeViaTempVar(null, argPath);
                    })
                ));

            case "ObjectExpression":
                return finish(t.objectExpression(
                    path.get("properties").map((propPath) => {
                        if (propPath.isObjectProperty()) {
                            return t.objectProperty(
                                propPath.node.key,
                                explodeViaTempVar(null, propPath.get("value")),
                                propPath.node.computed
                            );
                        }
                        return propPath.node;

                    })
                ));

            case "ArrayExpression":
                return finish(t.arrayExpression(
                    path.get("elements").map((elemPath) => {
                        return explodeViaTempVar(null, elemPath);
                    })
                ));

            case "SequenceExpression": {
                const lastIndex = expr.expressions.length - 1;

                path.get("expressions").forEach((exprPath) => {
                    if (exprPath.key === lastIndex) {
                        result = self.explodeExpression(exprPath, ignoreResult);
                    } else {
                        self.explodeExpression(exprPath, true);
                    }
                });

                return result;
            }
            case "LogicalExpression": {
                after = loc();

                if (!ignoreResult) {
                    result = self.makeTempVar();
                }

                const left = explodeViaTempVar(result, path.get("left"));

                if (expr.operator === "&&") {
                    self.jumpIfNot(left, after);
                } else {
                    assert.strictEqual(expr.operator, "||");
                    self.jumpIf(left, after);
                }

                explodeViaTempVar(result, path.get("right"), ignoreResult);

                self.mark(after);

                return result;
            }
            case "ConditionalExpression": {
                const elseLoc = loc();
                after = loc();
                const test = self.explodeExpression(path.get("test"));

                self.jumpIfNot(test, elseLoc);

                if (!ignoreResult) {
                    result = self.makeTempVar();
                }

                explodeViaTempVar(result, path.get("consequent"), ignoreResult);
                self.jump(after);

                self.mark(elseLoc);
                explodeViaTempVar(result, path.get("alternate"), ignoreResult);

                self.mark(after);

                return result;
            }
            case "UnaryExpression":
                return finish(t.unaryExpression(
                    expr.operator,
                    // Can't (and don't need to) break up the syntax of the argument.
                    // Think about delete a[b].
                    self.explodeExpression(path.get("argument")),
                    Boolean(expr.prefix)
                ));

            case "BinaryExpression":
                return finish(t.binaryExpression(
                    expr.operator,
                    explodeViaTempVar(null, path.get("left")),
                    explodeViaTempVar(null, path.get("right"))
                ));

            case "AssignmentExpression":
                return finish(t.assignmentExpression(
                    expr.operator,
                    self.explodeExpression(path.get("left")),
                    self.explodeExpression(path.get("right"))
                ));

            case "UpdateExpression":
                return finish(t.updateExpression(
                    expr.operator,
                    self.explodeExpression(path.get("argument")),
                    expr.prefix
                ));

            case "YieldExpression": {
                after = loc();
                const arg = expr.argument && self.explodeExpression(path.get("argument"));

                if (arg && expr.delegate) {
                    const result = self.makeTempVar();

                    self.emit(t.returnStatement(t.callExpression(
                        self.contextProperty("delegateYield"), [
                            arg,
                            t.stringLiteral(result.property.name),
                            after
                        ]
                    )));

                    self.mark(after);

                    return result;
                }

                self.emitAssign(self.contextProperty("next"), after);
                self.emit(t.returnStatement(arg || null));
                self.mark(after);

                return self.contextProperty("sent");
            }
            default:
                throw new Error(`unknown Expression of type ${JSON.stringify(expr.type)}`);
        }
    }
}

class Entry {
    constructor() {
        assert.ok(this instanceof Entry);
    }
}

class FunctionEntry extends Entry {
    constructor(returnLoc) {
        super();
        t.assertLiteral(returnLoc);
        this.returnLoc = returnLoc;
    }
}


class LoopEntry extends Entry {
    constructor(breakLoc, continueLoc, label) {
        super();

        t.assertLiteral(breakLoc);
        t.assertLiteral(continueLoc);

        if (label) {
            t.assertIdentifier(label);
        } else {
            label = null;
        }

        this.breakLoc = breakLoc;
        this.continueLoc = continueLoc;
        this.label = label;
    }
}

class SwitchEntry extends Entry {
    constructor(breakLoc) {
        super();
        t.assertLiteral(breakLoc);
        this.breakLoc = breakLoc;
    }
}

class CatchEntry extends Entry {
    constructor(firstLoc, paramId) {
        super();

        t.assertLiteral(firstLoc);
        t.assertIdentifier(paramId);

        this.firstLoc = firstLoc;
        this.paramId = paramId;
    }
}

class FinallyEntry extends Entry {
    constructor(firstLoc, afterLoc) {
        super();
        t.assertLiteral(firstLoc);
        t.assertLiteral(afterLoc);
        this.firstLoc = firstLoc;
        this.afterLoc = afterLoc;
    }
}

class TryEntry extends Entry {
    constructor(firstLoc, catchEntry, finallyEntry) {
        super();

        t.assertLiteral(firstLoc);

        if (catchEntry) {
            assert.ok(catchEntry instanceof CatchEntry);
        } else {
            catchEntry = null;
        }

        if (finallyEntry) {
            assert.ok(finallyEntry instanceof FinallyEntry);
        } else {
            finallyEntry = null;
        }

        // Have to have one or the other (or both).
        assert.ok(catchEntry || finallyEntry);

        this.firstLoc = firstLoc;
        this.catchEntry = catchEntry;
        this.finallyEntry = finallyEntry;
    }
}

class LabeledEntry extends Entry {
    constructor(breakLoc, label) {
        super();

        t.assertLiteral(breakLoc);
        t.assertIdentifier(label);

        this.breakLoc = breakLoc;
        this.label = label;
    }
}

class LeapManager {
    constructor(emitter) {
        assert.ok(this instanceof LeapManager);

        // let Emitter = require("./emit").Emitter;
        assert.ok(emitter instanceof Emitter);

        this.emitter = emitter;
        this.entryStack = [new FunctionEntry(emitter.finalLoc)];
    }

    withEntry(entry, callback) {
        assert.ok(entry instanceof Entry);
        this.entryStack.push(entry);
        try {
            callback.call(this.emitter);
        } finally {
            const popped = this.entryStack.pop();
            assert.strictEqual(popped, entry);
        }
    }

    _findLeapLocation(property, label) {
        for (let i = this.entryStack.length - 1; i >= 0; --i) {
            const entry = this.entryStack[i];
            const loc = entry[property];
            if (loc) {
                if (label) {
                    if (entry.label &&
                        entry.label.name === label.name) {
                        return loc;
                    }
                } else if (entry instanceof LabeledEntry) {
                    // Ignore LabeledEntry entries unless we are actually breaking to
                    // a label.
                } else {
                    return loc;
                }
            }
        }

        return null;
    }

    getBreakLoc(label) {
        return this._findLeapLocation("breakLoc", label);
    }

    getContinueLoc(label) {
        return this._findLeapLocation("continueLoc", label);
    }
}

// The hoist function takes a FunctionExpression or FunctionDeclaration
// and replaces any Declaration nodes in its body with assignments, then
// returns a VariableDeclaration containing just the names of the removed
// declarations.
const hoist = function (funPath) {
    t.assertFunction(funPath.node);

    const vars = {};

    const varDeclToExpr = (vdec, includeIdentifiers) => {
        t.assertVariableDeclaration(vdec);
        // TODO assert.equal(vdec.kind, "var");
        const exprs = [];

        vdec.declarations.forEach((dec) => {
            // Note: We duplicate 'dec.id' here to ensure that the variable declaration IDs don't
            // have the same 'loc' value, since that can make sourcemaps and retainLines behave poorly.
            vars[dec.id.name] = t.identifier(dec.id.name);

            if (dec.init) {
                exprs.push(t.assignmentExpression(
                    "=", dec.id, dec.init
                ));
            } else if (includeIdentifiers) {
                exprs.push(dec.id);
            }
        });

        if (exprs.length === 0) {
            return null;
        }

        if (exprs.length === 1) {
            return exprs[0];
        }

        return t.sequenceExpression(exprs);
    };

    funPath.get("body").traverse({
        VariableDeclaration: {
            exit(path) {
                const expr = varDeclToExpr(path.node, false);
                if (is.null(expr)) {
                    path.remove();
                } else {
                    // We don't need to traverse this expression any further because
                    // there can't be any new declarations inside an expression.
                    util.replaceWithOrRemove(path, t.expressionStatement(expr));
                }

                // Since the original node has been either removed or replaced,
                // avoid traversing it any further.
                path.skip();
            }
        },

        ForStatement(path) {
            const init = path.node.init;
            if (t.isVariableDeclaration(init)) {
                util.replaceWithOrRemove(path.get("init"), varDeclToExpr(init, false));
            }
        },

        ForXStatement(path) {
            const left = path.get("left");
            if (left.isVariableDeclaration()) {
                util.replaceWithOrRemove(left, varDeclToExpr(left.node, true));
            }
        },

        FunctionDeclaration(path) {
            const node = path.node;
            vars[node.id.name] = node.id;

            const assignment = t.expressionStatement(
                t.assignmentExpression(
                    "=",
                    node.id,
                    t.functionExpression(
                        node.id,
                        node.params,
                        node.body,
                        node.generator,
                        node.expression
                    )
                )
            );

            if (path.parentPath.isBlockStatement()) {
                // Insert the assignment form before the first statement in the
                // enclosing block.
                path.parentPath.unshiftContainer("body", assignment);

                // Remove the function declaration now that we've inserted the
                // equivalent assignment form at the beginning of the block.
                path.remove();
            } else {
                // If the parent node is not a block statement, then we can just
                // replace the declaration with the equivalent assignment form
                // without worrying about hoisting it.
                util.replaceWithOrRemove(path, assignment);
            }

            // Don't hoist variables out of inner functions.
            path.skip();
        },

        FunctionExpression(path) {
            // Don't descend into nested function expressions.
            path.skip();
        }
    });

    const paramNames = {};
    funPath.get("params").forEach((paramPath) => {
        const param = paramPath.node;
        if (t.isIdentifier(param)) {
            paramNames[param.name] = param;
        } else {
            // Variables declared by destructuring parameter patterns will be
            // harmlessly re-declared.
        }
    });

    const declarations = [];

    Object.keys(vars).forEach((name) => {
        if (!hasOwn.call(paramNames, name)) {
            declarations.push(t.variableDeclarator(vars[name], null));
        }
    });

    if (declarations.length === 0) {
        return null; // Be sure to handle this case!
    }

    return t.variableDeclaration("var", declarations);
};

const getMarkInfo = require("private").makeAccessor();

const getRuntimeMarkDecl = (blockPath) => {
    const block = blockPath.node;

    const info = getMarkInfo(block);
    if (info.decl) {
        return info.decl;
    }

    info.decl = t.variableDeclaration("var", [
        t.variableDeclarator(
            blockPath.scope.generateUidIdentifier("marked"),
            t.callExpression(
                t.memberExpression(
                    t.arrayExpression([]),
                    t.identifier("map"),
                    false
                ),
                [util.runtimeProperty("mark")]
            )
        )
    ]);

    blockPath.unshiftContainer("body", info.decl);

    return info.decl;
};

// Given a NodePath for a Function, return an Expression node that can be
// used to refer reliably to the function object from inside the function.
// This expression is essentially a replacement for arguments.callee, with
// the key advantage that it works in strict mode.
const getOuterFnExpr = (funPath) => {
    const node = funPath.node;
    t.assertFunction(node);

    if (!node.id) {
        // Default-exported function declarations, and function expressions may not
        // have a name to reference, so we explicitly add one.
        node.id = funPath.scope.parent.generateUidIdentifier("callee");
    }

    if (node.generator && // Non-generator functions don't need to be marked.
        t.isFunctionDeclaration(node)) {
        const pp = funPath.findParent((path) => {
            return path.isProgram() || path.isBlockStatement();
        });

        if (!pp) {
            return node.id;
        }

        const markDecl = getRuntimeMarkDecl(pp);
        const markedArray = markDecl.declarations[0].id;
        const funDeclIdArray = markDecl.declarations[0].init.callee.object;
        t.assertArrayExpression(funDeclIdArray);

        const index = funDeclIdArray.elements.length;
        funDeclIdArray.elements.push(node.id);

        return t.memberExpression(
            markedArray,
            t.numericLiteral(index),
            true
        );
    }

    return node.id;
};

const argumentsVisitor = {
    "FunctionExpression|FunctionDeclaration"(path) {
        path.skip();
    },

    Identifier(path, state) {
        if (path.node.name === "arguments" && util.isReference(path)) {
            util.replaceWithOrRemove(path, state.argsId);
            state.didRenameArguments = true;
        }
    }
};

const renameArguments = (funcPath, argsId) => {
    const state = {
        didRenameArguments: false,
        argsId
    };

    funcPath.traverse(argumentsVisitor, state);

    // If the traversal replaced any arguments references, then we need to
    // alias the outer function's arguments binding (be it the implicit
    // arguments object or some other parameter or variable) to the variable
    // named by argsId.
    return state.didRenameArguments;
};

const functionSentVisitor = {
    MetaProperty(path) {
        const { node } = path;

        if (node.meta.name === "function" && node.property.name === "sent") {
            util.replaceWithOrRemove(path, t.memberExpression(this.context, t.identifier("_sent")));
        }
    }
};

const awaitVisitor = {
    Function(path) {
        path.skip(); // Don't descend into nested function scopes.
    },

    AwaitExpression(path) {
        // Convert await expressions to yield expressions.
        const argument = path.node.argument;

        // Transforming `await x` to `yield regeneratorRuntime.awrap(x)`
        // causes the argument to be wrapped in such a way that the runtime
        // can distinguish between awaited and merely yielded values.
        util.replaceWithOrRemove(path, t.yieldExpression(
            t.callExpression(
                util.runtimeProperty("awrap"),
                [argument]
            ),
            false
        ));
    }
};


export default function () {
    return {
        name: "regenerator-transform",
        visitor: {
            Function: {
                exit(path, state) {
                    let node = path.node;

                    if (node.generator) {
                        if (node.async) {
                            // Async generator
                            if (state.opts.asyncGenerators === false) {
                                return;
                            }
                        } else {
                            // Plain generator
                            if (state.opts.generators === false) {
                                return;
                            }
                        }
                    } else if (node.async) {
                        // Async function
                        if (state.opts.async === false) {
                            return;
                        }
                    } else {
                        // Not a generator or async function.
                        return;
                    }

                    // if this is an ObjectMethod, we need to convert it to an ObjectProperty
                    path = replaceShorthandObjectMethod(path);
                    node = path.node;

                    const contextId = path.scope.generateUidIdentifier("context");
                    const argsId = path.scope.generateUidIdentifier("args");

                    path.ensureBlock();
                    const bodyBlockPath = path.get("body");

                    if (node.async) {
                        bodyBlockPath.traverse(awaitVisitor);
                    }

                    bodyBlockPath.traverse(functionSentVisitor, {
                        context: contextId
                    });

                    const outerBody = [];
                    const innerBody = [];

                    bodyBlockPath.get("body").forEach((childPath) => {
                        const node = childPath.node;
                        if (t.isExpressionStatement(node) &&
                            t.isStringLiteral(node.expression)) {
                            // Babylon represents directives like "use strict" as elements
                            // of a bodyBlockPath.node.directives array, but they could just
                            // as easily be represented (by other parsers) as traditional
                            // string-literal-valued expression statements, so we need to
                            // handle that here. (#248)
                            outerBody.push(node);
                        } else if (node && !is.nil(node._blockHoist)) {
                            outerBody.push(node);
                        } else {
                            innerBody.push(node);
                        }
                    });

                    if (outerBody.length > 0) {
                        // Only replace the inner body if we actually hoisted any statements
                        // to the outer body.
                        bodyBlockPath.node.body = innerBody;
                    }

                    const outerFnExpr = getOuterFnExpr(path);
                    // Note that getOuterFnExpr has the side-effect of ensuring that the
                    // function has a name (so node.id will always be an Identifier), even
                    // if a temporary name has to be synthesized.
                    t.assertIdentifier(node.id);
                    const innerFnId = t.identifier(`${node.id.name}$`);

                    // Turn all declarations into vars, and replace the original
                    // declarations with equivalent assignment expressions.
                    let vars = hoist(path);

                    const didRenameArguments = renameArguments(path, argsId);
                    if (didRenameArguments) {
                        vars = vars || t.variableDeclaration("var", []);
                        const argumentIdentifier = t.identifier("arguments");
                        // we need to do this as otherwise arguments in arrow functions gets hoisted
                        argumentIdentifier._shadowedFunctionLiteral = path;
                        vars.declarations.push(t.variableDeclarator(
                            argsId, argumentIdentifier
                        ));
                    }

                    const emitter = new Emitter(contextId);
                    emitter.explode(path.get("body"));

                    if (vars && vars.declarations.length > 0) {
                        outerBody.push(vars);
                    }

                    const wrapArgs = [
                        emitter.getContextFunction(innerFnId),
                        // Async functions that are not generators don't care about the
                        // outer function because they don't need it to be marked and don't
                        // inherit from its .prototype.
                        node.generator ? outerFnExpr : t.nullLiteral(),
                        t.thisExpression()
                    ];

                    const tryLocsList = emitter.getTryLocsList();
                    if (tryLocsList) {
                        wrapArgs.push(tryLocsList);
                    }

                    const wrapCall = t.callExpression(
                        util.runtimeProperty(node.async ? "async" : "wrap"),
                        wrapArgs
                    );

                    outerBody.push(t.returnStatement(wrapCall));
                    node.body = t.blockStatement(outerBody);

                    const oldDirectives = bodyBlockPath.node.directives;
                    if (oldDirectives) {
                        // Babylon represents directives like "use strict" as elements of
                        // a bodyBlockPath.node.directives array. (#248)
                        node.body.directives = oldDirectives;
                    }

                    const wasGeneratorFunction = node.generator;
                    if (wasGeneratorFunction) {
                        node.generator = false;
                    }

                    if (node.async) {
                        node.async = false;
                    }

                    if (wasGeneratorFunction && t.isExpression(node)) {
                        util.replaceWithOrRemove(path, t.callExpression(util.runtimeProperty("mark"), [node]));
                    }

                    // Generators are processed in 'exit' handlers so that regenerator only has to run on
                    // an ES5 AST, but that means traversal will not pick up newly inserted references
                    // to things like 'regeneratorRuntime'. To avoid this, we explicitly requeue.
                    path.requeue();
                }
            }
        }
    };
}
