const { js: { compiler: { types: t } } } = adone;

export { default as Identifier } from "./inferer_reference";

export const VariableDeclarator = function () {
    const id = this.get("id");

    if (id.isIdentifier()) {
        return this.get("init").getTypeAnnotation();
    }


};

export const TypeCastExpression = function (node) {
    return node.typeAnnotation;
};

TypeCastExpression.validParent = true;

export const NewExpression = function (node) {
    if (this.get("callee").isIdentifier()) {
        // only resolve identifier callee
        return t.genericTypeAnnotation(node.callee);
    }
};

export const TemplateLiteral = function () {
    return t.stringTypeAnnotation();
};

export const UnaryExpression = function (node) {
    const operator = node.operator;

    if (operator === "void") {
        return t.voidTypeAnnotation();
    } else if (t.NUMBER_UNARY_OPERATORS.indexOf(operator) >= 0) {
        return t.numberTypeAnnotation();
    } else if (t.STRING_UNARY_OPERATORS.indexOf(operator) >= 0) {
        return t.stringTypeAnnotation();
    } else if (t.BOOLEAN_UNARY_OPERATORS.indexOf(operator) >= 0) {
        return t.booleanTypeAnnotation();
    }
};

export const BinaryExpression = function (node) {
    const operator = node.operator;

    if (t.NUMBER_BINARY_OPERATORS.indexOf(operator) >= 0) {
        return t.numberTypeAnnotation();
    } else if (t.BOOLEAN_BINARY_OPERATORS.indexOf(operator) >= 0) {
        return t.booleanTypeAnnotation();
    } else if (operator === "+") {
        const right = this.get("right");
        const left = this.get("left");

        if (left.isBaseType("number") && right.isBaseType("number")) {
            // both numbers so this will be a number
            return t.numberTypeAnnotation();
        } else if (left.isBaseType("string") || right.isBaseType("string")) {
            // one is a string so the result will be a string
            return t.stringTypeAnnotation();
        }

        // unsure if left and right are strings or numbers so stay on the safe side
        return t.unionTypeAnnotation([
            t.stringTypeAnnotation(),
            t.numberTypeAnnotation()
        ]);
    }
};

export const LogicalExpression = function () {
    return t.createUnionTypeAnnotation([
        this.get("left").getTypeAnnotation(),
        this.get("right").getTypeAnnotation()
    ]);
};

export const ConditionalExpression = function () {
    return t.createUnionTypeAnnotation([
        this.get("consequent").getTypeAnnotation(),
        this.get("alternate").getTypeAnnotation()
    ]);
};

export const SequenceExpression = function () {
    return this.get("expressions").pop().getTypeAnnotation();
};

export const AssignmentExpression = function () {
    return this.get("right").getTypeAnnotation();
};

export const UpdateExpression = function (node) {
    const operator = node.operator;
    if (operator === "++" || operator === "--") {
        return t.numberTypeAnnotation();
    }
};

export const StringLiteral = function () {
    return t.stringTypeAnnotation();
};

export const NumericLiteral = function () {
    return t.numberTypeAnnotation();
};

export const BooleanLiteral = function () {
    return t.booleanTypeAnnotation();
};

export const NullLiteral = function () {
    return t.nullLiteralTypeAnnotation();
};

export const RegExpLiteral = function () {
    return t.genericTypeAnnotation(t.identifier("RegExp"));
};

export const ObjectExpression = function () {
    return t.genericTypeAnnotation(t.identifier("Object"));
};

export const ArrayExpression = function () {
    return t.genericTypeAnnotation(t.identifier("Array"));
};

export const RestElement = function () {
    return ArrayExpression();
};

RestElement.validParent = true;

const Func = function () {
    return t.genericTypeAnnotation(t.identifier("Function"));
};

export {
    Func as FunctionExpression,
    Func as ArrowFunctionExpression,
    Func as FunctionDeclaration,
    Func as ClassExpression,
    Func as ClassDeclaration
};

const resolveCall = function (callee) {
    callee = callee.resolve();

    if (callee.isFunction()) {
        if (callee.is("async")) {
            if (callee.is("generator")) {
                return t.genericTypeAnnotation(t.identifier("AsyncIterator"));
            }
            return t.genericTypeAnnotation(t.identifier("Promise"));

        }
        if (callee.node.returnType) {
            return callee.node.returnType;
        }
        // todo: get union type of all return arguments


    }
};

export const CallExpression = function () {
    return resolveCall(this.get("callee"));
};

export const TaggedTemplateExpression = function () {
    return resolveCall(this.get("tag"));
};
