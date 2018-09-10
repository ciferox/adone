import * as n from "../node";

const {
    is,
    js: { compiler: { types: t } }
} = adone;

export const UnaryExpression = function (node) {
    if (
        node.operator === "void" ||
        node.operator === "delete" ||
        node.operator === "typeof"
    ) {
        this.word(node.operator);
        this.space();
    } else {
        this.token(node.operator);
    }

    this.print(node.argument, node);
};

export const DoExpression = function (node) {
    this.word("do");
    this.space();
    this.print(node.body, node);
};

export const ParenthesizedExpression = function (node) {
    this.token("(");
    this.print(node.expression, node);
    this.token(")");
};

export const UpdateExpression = function (node) {
    if (node.prefix) {
        this.token(node.operator);
        this.print(node.argument, node);
    } else {
        this.startTerminatorless(true);
        this.print(node.argument, node);
        this.endTerminatorless();
        this.token(node.operator);
    }
};

export const ConditionalExpression = function (node) {
    this.print(node.test, node);
    this.space();
    this.token("?");
    this.space();
    this.print(node.consequent, node);
    this.space();
    this.token(":");
    this.space();
    this.print(node.alternate, node);
};

export const NewExpression = function (node, parent) {
    this.word("new");
    this.space();
    this.print(node.callee, node);
    if (
        this.format.minified &&
        node.arguments.length === 0 &&
        !node.optional &&
        !t.isCallExpression(parent, { callee: node }) &&
        !t.isMemberExpression(parent) &&
        !t.isNewExpression(parent)
    ) {
        return;
    }

    this.print(node.typeArguments, node); // Flow
    this.print(node.typeParameters, node); // TS

    if (node.optional) {
        this.token("?.");
    }
    this.token("(");
    this.printList(node.arguments, node);
    this.token(")");
};

export const SequenceExpression = function (node) {
    this.printList(node.expressions, node);
};

export const ThisExpression = function () {
    this.word("this");
};

export const Super = function () {
    this.word("super");
};

export const Decorator = function (node) {
    this.token("@");
    this.print(node.expression, node);
    this.newline();
};

export const OptionalMemberExpression = function (node) {
    this.print(node.object, node);

    if (!node.computed && t.isMemberExpression(node.property)) {
        throw new TypeError("Got a MemberExpression for MemberExpression property");
    }

    let computed = node.computed;
    if (t.isLiteral(node.property) && is.number(node.property.value)) {
        computed = true;
    }
    if (node.optional) {
        this.token("?.");
    }

    if (computed) {
        this.token("[");
        this.print(node.property, node);
        this.token("]");
    } else {
        if (!node.optional) {
            this.token(".");
        }
        this.print(node.property, node);
    }
};

export const OptionalCallExpression = function (node) {
    this.print(node.callee, node);

    this.print(node.typeArguments, node); // Flow
    this.print(node.typeParameters, node); // TS

    if (node.optional) {
        this.token("?.");
    }
    this.token("(");
    this.printList(node.arguments, node);
    this.token(")");
};

export const CallExpression = function (node) {
    this.print(node.callee, node);

    this.print(node.typeArguments, node); // Flow
    this.print(node.typeParameters, node); // TS
    this.token("(");
    this.printList(node.arguments, node);
    this.token(")");
};

export const Import = function () {
    this.word("import");
};

const buildYieldAwait = function (keyword) {
    return function (node) {
        this.word(keyword);

        if (node.delegate) {
            this.token("*");
        }

        if (node.argument) {
            this.space();
            const terminatorState = this.startTerminatorless();
            this.print(node.argument, node);
            this.endTerminatorless(terminatorState);
        }
    };
};

export const YieldExpression = buildYieldAwait("yield");
export const AwaitExpression = buildYieldAwait("await");

export const EmptyStatement = function () {
    this.semicolon(true /* force */);
};

export const ExpressionStatement = function (node) {
    this.print(node.expression, node);
    this.semicolon();
};

export const AssignmentPattern = function (node) {
    this.print(node.left, node);
    if (node.left.optional) {
        this.token("?");
    }
    this.print(node.left.typeAnnotation, node);
    this.space();
    this.token("=");
    this.space();
    this.print(node.right, node);
};

export const AssignmentExpression = function (node, parent) {
    // Somewhere inside a for statement `init` node but doesn't usually
    // needs a paren except for `in` expressions: `for (a in b ? a : b;;)`
    const parens =
        this.inForStatementInitCounter &&
        node.operator === "in" &&
        !n.needsParens(node, parent);

    if (parens) {
        this.token("(");
    }

    this.print(node.left, node);

    this.space();
    if (node.operator === "in" || node.operator === "instanceof") {
        this.word(node.operator);
    } else {
        this.token(node.operator);
    }
    this.space();

    this.print(node.right, node);

    if (parens) {
        this.token(")");
    }
};

export const BindExpression = function (node) {
    this.print(node.object, node);
    this.token("::");
    this.print(node.callee, node);
};

export {
    AssignmentExpression as BinaryExpression,
    AssignmentExpression as LogicalExpression
};

export const MemberExpression = function (node) {
    this.print(node.object, node);

    if (!node.computed && t.isMemberExpression(node.property)) {
        throw new TypeError("Got a MemberExpression for MemberExpression property");
    }

    let computed = node.computed;
    if (t.isLiteral(node.property) && is.number(node.property.value)) {
        computed = true;
    }

    if (computed) {
        this.token("[");
        this.print(node.property, node);
        this.token("]");
    } else {
        this.token(".");
        this.print(node.property, node);
    }
};

export const MetaProperty = function (node) {
    this.print(node.meta, node);
    this.token(".");
    this.print(node.property, node);
};

export const PrivateName = function (node) {
    this.token("#");
    this.print(node.id, node);
};
