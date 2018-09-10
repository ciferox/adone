const {
    js: { compiler: { types: t } }
} = adone;

// Recursively get the last statement.
const getLastStatement = function (statement) {
    if (!t.isStatement(statement.body)) {
        return statement;
    }
    return getLastStatement(statement.body);
};


export const WithStatement = function (node) {
    this.word("with");
    this.space();
    this.token("(");
    this.print(node.object, node);
    this.token(")");
    this.printBlock(node);
};

export const IfStatement = function (node) {
    this.word("if");
    this.space();
    this.token("(");
    this.print(node.test, node);
    this.token(")");
    this.space();

    const needsBlock =
        node.alternate && t.isIfStatement(getLastStatement(node.consequent));
    if (needsBlock) {
        this.token("{");
        this.newline();
        this.indent();
    }

    this.printAndIndentOnComments(node.consequent, node);

    if (needsBlock) {
        this.dedent();
        this.newline();
        this.token("}");
    }

    if (node.alternate) {
        if (this.endsWith("}")) {
            this.space();
        }
        this.word("else");
        this.space();
        this.printAndIndentOnComments(node.alternate, node);
    }
};

export const ForStatement = function (node) {
    this.word("for");
    this.space();
    this.token("(");

    this.inForStatementInitCounter++;
    this.print(node.init, node);
    this.inForStatementInitCounter--;
    this.token(";");

    if (node.test) {
        this.space();
        this.print(node.test, node);
    }
    this.token(";");

    if (node.update) {
        this.space();
        this.print(node.update, node);
    }

    this.token(")");
    this.printBlock(node);
};

export const WhileStatement = function (node) {
    this.word("while");
    this.space();
    this.token("(");
    this.print(node.test, node);
    this.token(")");
    this.printBlock(node);
};

const buildForXStatement = function (op) {
    return function (node) {
        this.word("for");
        this.space();
        if (op === "of" && node.await) {
            this.word("await");
            this.space();
        }
        this.token("(");
        this.print(node.left, node);
        this.space();
        this.word(op);
        this.space();
        this.print(node.right, node);
        this.token(")");
        this.printBlock(node);
    };
};

export const ForInStatement = buildForXStatement("in");
export const ForOfStatement = buildForXStatement("of");

export const DoWhileStatement = function (node) {
    this.word("do");
    this.space();
    this.print(node.body, node);
    this.space();
    this.word("while");
    this.space();
    this.token("(");
    this.print(node.test, node);
    this.token(")");
    this.semicolon();
};

const buildLabelStatement = function (prefix, key = "label") {
    return function (node) {
        this.word(prefix);

        const label = node[key];
        if (label) {
            this.space();
            const isLabel = key === "label";
            const terminatorState = this.startTerminatorless(isLabel);
            this.print(label, node);
            this.endTerminatorless(terminatorState);
        }

        this.semicolon();
    };
};

export const ContinueStatement = buildLabelStatement("continue");
export const ReturnStatement = buildLabelStatement("return", "argument");
export const BreakStatement = buildLabelStatement("break");
export const ThrowStatement = buildLabelStatement("throw", "argument");

export const LabeledStatement = function (node) {
    this.print(node.label, node);
    this.token(":");
    this.space();
    this.print(node.body, node);
};

export const TryStatement = function (node) {
    this.word("try");
    this.space();
    this.print(node.block, node);
    this.space();

    // Esprima bug puts the catch clause in a `handlers` array.
    // see https://code.google.com/p/esprima/issues/detail?id=433
    // We run into this from regenerator generated ast.
    if (node.handlers) {
        this.print(node.handlers[0], node);
    } else {
        this.print(node.handler, node);
    }

    if (node.finalizer) {
        this.space();
        this.word("finally");
        this.space();
        this.print(node.finalizer, node);
    }
};

export const CatchClause = function (node) {
    this.word("catch");
    this.space();
    if (node.param) {
        this.token("(");
        this.print(node.param, node);
        this.token(")");
        this.space();
    }
    this.print(node.body, node);
};

export const SwitchStatement = function (node) {
    this.word("switch");
    this.space();
    this.token("(");
    this.print(node.discriminant, node);
    this.token(")");
    this.space();
    this.token("{");

    this.printSequence(node.cases, node, {
        indent: true,
        addNewlines(leading, cas) {
            if (!leading && node.cases[node.cases.length - 1] === cas) {
                return -1;
            }
        }
    });

    this.token("}");
};

export const SwitchCase = function (node) {
    if (node.test) {
        this.word("case");
        this.space();
        this.print(node.test, node);
        this.token(":");
    } else {
        this.word("default");
        this.token(":");
    }

    if (node.consequent.length) {
        this.newline();
        this.printSequence(node.consequent, node, { indent: true });
    }
};

export const DebuggerStatement = function () {
    this.word("debugger");
    this.semicolon();
};

const variableDeclarationIndent = function () {
    // "let " or "var " indentation.
    this.token(",");
    this.newline();
    if (this.endsWith("\n")) {
        for (let i = 0; i < 4; i++) {
            this.space(true);
        }
    }
};

const constDeclarationIndent = function () {
    // "const " indentation.
    this.token(",");
    this.newline();
    if (this.endsWith("\n")) {
        for (let i = 0; i < 6; i++) {
            this.space(true);
        }
    }
};

export const VariableDeclaration = function (node, parent) {
    if (node.declare) {
        // TS
        this.word("declare");
        this.space();
    }

    this.word(node.kind);
    this.space();

    let hasInits = false;
    // don't add whitespace to loop heads
    if (!t.isFor(parent)) {
        for (const declar of (node.declarations)) {
            if (declar.init) {
                // has an init so let's split it up over multiple lines
                hasInits = true;
            }
        }
    }

    //
    // use a pretty separator when we aren't in compact mode, have initializers and don't have retainLines on
    // this will format declarations like:
    //
    //   let foo = "bar", bar = "foo";
    //
    // into
    //
    //   let foo = "bar",
    //       bar = "foo";
    //

    let separator;
    if (hasInits) {
        separator =
            node.kind === "const"
                ? constDeclarationIndent
                : variableDeclarationIndent;
    }

    //

    this.printList(node.declarations, node, { separator });

    if (t.isFor(parent)) {
        // don't give semicolons to these nodes since they'll be inserted in the parent generator
        if (parent.left === node || parent.init === node) {
            return;
        }
    }

    this.semicolon();
};

export const VariableDeclarator = function (node) {
    this.print(node.id, node);
    if (node.definite) {
        this.token("!");
    } // TS
    this.print(node.id.typeAnnotation, node);
    if (node.init) {
        this.space();
        this.token("=");
        this.space();
        this.print(node.init, node);
    }
};
