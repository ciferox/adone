// @flow
/*
 * This file is auto-generated! Do not modify it directly.
 * To re-generate run 'make build'
 */
import shallowEqual from "../../utils/shallowEqual";

const {
    is
} = adone;

export function isArrayExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ArrayExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isAssignmentExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "AssignmentExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBinaryExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BinaryExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isInterpreterDirective(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "InterpreterDirective") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDirective(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Directive") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDirectiveLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DirectiveLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBlockStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BlockStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBreakStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BreakStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isCallExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "CallExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isCatchClause(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "CatchClause") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isConditionalExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ConditionalExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isContinueStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ContinueStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDebuggerStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DebuggerStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDoWhileStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DoWhileStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isEmptyStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "EmptyStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExpressionStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExpressionStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFile(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "File") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isForInStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ForInStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isForStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ForStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFunctionDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "FunctionDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFunctionExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "FunctionExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isIdentifier(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Identifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isIfStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "IfStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isLabeledStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "LabeledStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isStringLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "StringLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNumericLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NumericLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNullLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NullLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBooleanLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BooleanLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isRegExpLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "RegExpLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isLogicalExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "LogicalExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isMemberExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "MemberExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNewExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NewExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isProgram(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Program") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectMethod(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectMethod") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectProperty(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isRestElement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "RestElement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isReturnStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ReturnStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isSequenceExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "SequenceExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isParenthesizedExpression(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ParenthesizedExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isSwitchCase(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "SwitchCase") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isSwitchStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "SwitchStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isThisExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ThisExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isThrowStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ThrowStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTryStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TryStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isUnaryExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "UnaryExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isUpdateExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "UpdateExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isVariableDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "VariableDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isVariableDeclarator(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "VariableDeclarator") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isWhileStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "WhileStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isWithStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "WithStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isAssignmentPattern(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "AssignmentPattern") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isArrayPattern(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ArrayPattern") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isArrowFunctionExpression(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ArrowFunctionExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassBody(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassBody") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExportAllDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExportAllDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExportDefaultDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExportDefaultDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExportNamedDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExportNamedDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExportSpecifier(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExportSpecifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isForOfStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ForOfStatement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isImportDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ImportDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isImportDefaultSpecifier(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ImportDefaultSpecifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isImportNamespaceSpecifier(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ImportNamespaceSpecifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isImportSpecifier(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ImportSpecifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isMetaProperty(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "MetaProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassMethod(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassMethod") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectPattern(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectPattern") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isSpreadElement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "SpreadElement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isSuper(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Super") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTaggedTemplateExpression(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TaggedTemplateExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTemplateElement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TemplateElement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTemplateLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TemplateLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isYieldExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "YieldExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isAnyTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "AnyTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isArrayTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ArrayTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBooleanTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BooleanTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBooleanLiteralTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BooleanLiteralTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNullLiteralTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NullLiteralTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassImplements(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassImplements") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareClass(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareClass") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareFunction(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareFunction") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareInterface(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareInterface") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareModule(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareModule") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareModuleExports(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareModuleExports") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareTypeAlias(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareTypeAlias") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareOpaqueType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareOpaqueType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareVariable(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareVariable") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareExportDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareExportDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclareExportAllDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclareExportAllDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclaredPredicate(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DeclaredPredicate") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExistsTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExistsTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFunctionTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "FunctionTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFunctionTypeParam(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "FunctionTypeParam") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isGenericTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "GenericTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isInferredPredicate(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "InferredPredicate") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isInterfaceExtends(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "InterfaceExtends") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isInterfaceDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "InterfaceDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isInterfaceTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "InterfaceTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isIntersectionTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "IntersectionTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isMixedTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "MixedTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isEmptyTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "EmptyTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNullableTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NullableTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNumberLiteralTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NumberLiteralTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNumberTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NumberTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectTypeInternalSlot(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectTypeInternalSlot") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectTypeCallProperty(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectTypeCallProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectTypeIndexer(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectTypeIndexer") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectTypeProperty(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectTypeProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectTypeSpreadProperty(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ObjectTypeSpreadProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isOpaqueType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "OpaqueType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isQualifiedTypeIdentifier(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "QualifiedTypeIdentifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isStringLiteralTypeAnnotation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "StringLiteralTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isStringTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "StringTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isThisTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ThisTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTupleTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TupleTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTypeofTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TypeofTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTypeAlias(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TypeAlias") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTypeCastExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TypeCastExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTypeParameter(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TypeParameter") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTypeParameterDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TypeParameterDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTypeParameterInstantiation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TypeParameterInstantiation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isUnionTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "UnionTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isVariance(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Variance") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isVoidTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "VoidTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXAttribute(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXAttribute") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXClosingElement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXClosingElement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXElement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXElement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXEmptyExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXEmptyExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXExpressionContainer(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXExpressionContainer") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXSpreadChild(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXSpreadChild") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXIdentifier(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXIdentifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXMemberExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXMemberExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXNamespacedName(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXNamespacedName") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXOpeningElement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXOpeningElement") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXSpreadAttribute(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXSpreadAttribute") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXText(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXText") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXFragment(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXFragment") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXOpeningFragment(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXOpeningFragment") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSXClosingFragment(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "JSXClosingFragment") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNoop(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Noop") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPlaceholder(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Placeholder") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isArgumentPlaceholder(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ArgumentPlaceholder") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isAwaitExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "AwaitExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBindExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BindExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassProperty(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isOptionalMemberExpression(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "OptionalMemberExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPipelineTopicExpression(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "PipelineTopicExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPipelineBareFunction(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "PipelineBareFunction") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPipelinePrimaryTopicReference(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "PipelinePrimaryTopicReference") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isOptionalCallExpression(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "OptionalCallExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassPrivateProperty(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassPrivateProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClassPrivateMethod(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ClassPrivateMethod") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isImport(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Import") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDecorator(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "Decorator") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDoExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "DoExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExportDefaultSpecifier(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExportDefaultSpecifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExportNamespaceSpecifier(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "ExportNamespaceSpecifier") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPrivateName(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "PrivateName") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBigIntLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "BigIntLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSParameterProperty(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSParameterProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSDeclareFunction(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSDeclareFunction") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSDeclareMethod(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSDeclareMethod") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSQualifiedName(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSQualifiedName") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSCallSignatureDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSCallSignatureDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSConstructSignatureDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSConstructSignatureDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSPropertySignature(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSPropertySignature") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSMethodSignature(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSMethodSignature") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSIndexSignature(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSIndexSignature") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSAnyKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSAnyKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSUnknownKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSUnknownKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSNumberKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSNumberKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSObjectKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSObjectKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSBooleanKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSBooleanKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSStringKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSStringKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSSymbolKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSSymbolKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSVoidKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSVoidKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSUndefinedKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSUndefinedKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSNullKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSNullKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSNeverKeyword(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSNeverKeyword") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSThisType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSThisType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSFunctionType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSFunctionType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSConstructorType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSConstructorType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeReference(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeReference") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypePredicate(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypePredicate") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeQuery(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeQuery") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSArrayType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSArrayType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTupleType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTupleType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSOptionalType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSOptionalType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSRestType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSRestType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSUnionType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSUnionType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSIntersectionType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSIntersectionType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSConditionalType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSConditionalType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSInferType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSInferType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSParenthesizedType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSParenthesizedType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeOperator(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeOperator") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSIndexedAccessType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSIndexedAccessType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSMappedType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSMappedType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSLiteralType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSLiteralType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSExpressionWithTypeArguments(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSExpressionWithTypeArguments") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSInterfaceDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSInterfaceDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSInterfaceBody(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSInterfaceBody") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeAliasDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeAliasDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSAsExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSAsExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeAssertion(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeAssertion") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSEnumDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSEnumDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSEnumMember(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSEnumMember") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSModuleDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSModuleDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSModuleBlock(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSModuleBlock") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSImportType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSImportType") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSImportEqualsDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSImportEqualsDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSExternalModuleReference(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSExternalModuleReference") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSNonNullExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSNonNullExpression") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSExportAssignment(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSExportAssignment") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSNamespaceExportDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSNamespaceExportDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeAnnotation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeParameterInstantiation(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeParameterInstantiation") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeParameterDeclaration(
    node: ?Object,
    opts?: Object,
): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeParameterDeclaration") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeParameter(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "TSTypeParameter") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExpression(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Expression" ||
    nodeType === "ArrayExpression" ||
    nodeType === "AssignmentExpression" ||
    nodeType === "BinaryExpression" ||
    nodeType === "CallExpression" ||
    nodeType === "ConditionalExpression" ||
    nodeType === "FunctionExpression" ||
    nodeType === "Identifier" ||
    nodeType === "StringLiteral" ||
    nodeType === "NumericLiteral" ||
    nodeType === "NullLiteral" ||
    nodeType === "BooleanLiteral" ||
    nodeType === "RegExpLiteral" ||
    nodeType === "LogicalExpression" ||
    nodeType === "MemberExpression" ||
    nodeType === "NewExpression" ||
    nodeType === "ObjectExpression" ||
    nodeType === "SequenceExpression" ||
    nodeType === "ParenthesizedExpression" ||
    nodeType === "ThisExpression" ||
    nodeType === "UnaryExpression" ||
    nodeType === "UpdateExpression" ||
    nodeType === "ArrowFunctionExpression" ||
    nodeType === "ClassExpression" ||
    nodeType === "MetaProperty" ||
    nodeType === "Super" ||
    nodeType === "TaggedTemplateExpression" ||
    nodeType === "TemplateLiteral" ||
    nodeType === "YieldExpression" ||
    nodeType === "TypeCastExpression" ||
    nodeType === "JSXElement" ||
    nodeType === "JSXFragment" ||
    nodeType === "AwaitExpression" ||
    nodeType === "BindExpression" ||
    nodeType === "OptionalMemberExpression" ||
    nodeType === "PipelinePrimaryTopicReference" ||
    nodeType === "OptionalCallExpression" ||
    nodeType === "Import" ||
    nodeType === "DoExpression" ||
    nodeType === "BigIntLiteral" ||
    nodeType === "TSAsExpression" ||
    nodeType === "TSTypeAssertion" ||
    nodeType === "TSNonNullExpression" ||
    (nodeType === "Placeholder" &&
      (node.expectedNode === "Expression" ||
        node.expectedNode === "Identifier" ||
        node.expectedNode === "StringLiteral"))
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBinary(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Binary" ||
    nodeType === "BinaryExpression" ||
    nodeType === "LogicalExpression"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isScopable(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Scopable" ||
    nodeType === "BlockStatement" ||
    nodeType === "CatchClause" ||
    nodeType === "DoWhileStatement" ||
    nodeType === "ForInStatement" ||
    nodeType === "ForStatement" ||
    nodeType === "FunctionDeclaration" ||
    nodeType === "FunctionExpression" ||
    nodeType === "Program" ||
    nodeType === "ObjectMethod" ||
    nodeType === "SwitchStatement" ||
    nodeType === "WhileStatement" ||
    nodeType === "ArrowFunctionExpression" ||
    nodeType === "ClassDeclaration" ||
    nodeType === "ClassExpression" ||
    nodeType === "ForOfStatement" ||
    nodeType === "ClassMethod" ||
    nodeType === "ClassPrivateMethod" ||
    (nodeType === "Placeholder" && node.expectedNode === "BlockStatement")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBlockParent(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "BlockParent" ||
    nodeType === "BlockStatement" ||
    nodeType === "CatchClause" ||
    nodeType === "DoWhileStatement" ||
    nodeType === "ForInStatement" ||
    nodeType === "ForStatement" ||
    nodeType === "FunctionDeclaration" ||
    nodeType === "FunctionExpression" ||
    nodeType === "Program" ||
    nodeType === "ObjectMethod" ||
    nodeType === "SwitchStatement" ||
    nodeType === "WhileStatement" ||
    nodeType === "ArrowFunctionExpression" ||
    nodeType === "ForOfStatement" ||
    nodeType === "ClassMethod" ||
    nodeType === "ClassPrivateMethod" ||
    (nodeType === "Placeholder" && node.expectedNode === "BlockStatement")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isBlock(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Block" ||
    nodeType === "BlockStatement" ||
    nodeType === "Program" ||
    (nodeType === "Placeholder" && node.expectedNode === "BlockStatement")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Statement" ||
    nodeType === "BlockStatement" ||
    nodeType === "BreakStatement" ||
    nodeType === "ContinueStatement" ||
    nodeType === "DebuggerStatement" ||
    nodeType === "DoWhileStatement" ||
    nodeType === "EmptyStatement" ||
    nodeType === "ExpressionStatement" ||
    nodeType === "ForInStatement" ||
    nodeType === "ForStatement" ||
    nodeType === "FunctionDeclaration" ||
    nodeType === "IfStatement" ||
    nodeType === "LabeledStatement" ||
    nodeType === "ReturnStatement" ||
    nodeType === "SwitchStatement" ||
    nodeType === "ThrowStatement" ||
    nodeType === "TryStatement" ||
    nodeType === "VariableDeclaration" ||
    nodeType === "WhileStatement" ||
    nodeType === "WithStatement" ||
    nodeType === "ClassDeclaration" ||
    nodeType === "ExportAllDeclaration" ||
    nodeType === "ExportDefaultDeclaration" ||
    nodeType === "ExportNamedDeclaration" ||
    nodeType === "ForOfStatement" ||
    nodeType === "ImportDeclaration" ||
    nodeType === "DeclareClass" ||
    nodeType === "DeclareFunction" ||
    nodeType === "DeclareInterface" ||
    nodeType === "DeclareModule" ||
    nodeType === "DeclareModuleExports" ||
    nodeType === "DeclareTypeAlias" ||
    nodeType === "DeclareOpaqueType" ||
    nodeType === "DeclareVariable" ||
    nodeType === "DeclareExportDeclaration" ||
    nodeType === "DeclareExportAllDeclaration" ||
    nodeType === "InterfaceDeclaration" ||
    nodeType === "OpaqueType" ||
    nodeType === "TypeAlias" ||
    nodeType === "TSDeclareFunction" ||
    nodeType === "TSInterfaceDeclaration" ||
    nodeType === "TSTypeAliasDeclaration" ||
    nodeType === "TSEnumDeclaration" ||
    nodeType === "TSModuleDeclaration" ||
    nodeType === "TSImportEqualsDeclaration" ||
    nodeType === "TSExportAssignment" ||
    nodeType === "TSNamespaceExportDeclaration" ||
    (nodeType === "Placeholder" &&
      (node.expectedNode === "Statement" ||
        node.expectedNode === "Declaration" ||
        node.expectedNode === "BlockStatement"))
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTerminatorless(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Terminatorless" ||
    nodeType === "BreakStatement" ||
    nodeType === "ContinueStatement" ||
    nodeType === "ReturnStatement" ||
    nodeType === "ThrowStatement" ||
    nodeType === "YieldExpression" ||
    nodeType === "AwaitExpression"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isCompletionStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "CompletionStatement" ||
    nodeType === "BreakStatement" ||
    nodeType === "ContinueStatement" ||
    nodeType === "ReturnStatement" ||
    nodeType === "ThrowStatement"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isConditional(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Conditional" ||
    nodeType === "ConditionalExpression" ||
    nodeType === "IfStatement"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isLoop(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Loop" ||
    nodeType === "DoWhileStatement" ||
    nodeType === "ForInStatement" ||
    nodeType === "ForStatement" ||
    nodeType === "WhileStatement" ||
    nodeType === "ForOfStatement"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isWhile(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "While" ||
    nodeType === "DoWhileStatement" ||
    nodeType === "WhileStatement"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExpressionWrapper(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "ExpressionWrapper" ||
    nodeType === "ExpressionStatement" ||
    nodeType === "ParenthesizedExpression" ||
    nodeType === "TypeCastExpression"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFor(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "For" ||
    nodeType === "ForInStatement" ||
    nodeType === "ForStatement" ||
    nodeType === "ForOfStatement"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isForXStatement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "ForXStatement" ||
    nodeType === "ForInStatement" ||
    nodeType === "ForOfStatement"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFunction(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Function" ||
    nodeType === "FunctionDeclaration" ||
    nodeType === "FunctionExpression" ||
    nodeType === "ObjectMethod" ||
    nodeType === "ArrowFunctionExpression" ||
    nodeType === "ClassMethod" ||
    nodeType === "ClassPrivateMethod"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFunctionParent(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "FunctionParent" ||
    nodeType === "FunctionDeclaration" ||
    nodeType === "FunctionExpression" ||
    nodeType === "ObjectMethod" ||
    nodeType === "ArrowFunctionExpression" ||
    nodeType === "ClassMethod" ||
    nodeType === "ClassPrivateMethod"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPureish(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Pureish" ||
    nodeType === "FunctionDeclaration" ||
    nodeType === "FunctionExpression" ||
    nodeType === "StringLiteral" ||
    nodeType === "NumericLiteral" ||
    nodeType === "NullLiteral" ||
    nodeType === "BooleanLiteral" ||
    nodeType === "ArrowFunctionExpression" ||
    nodeType === "ClassDeclaration" ||
    nodeType === "ClassExpression" ||
    nodeType === "BigIntLiteral" ||
    (nodeType === "Placeholder" && node.expectedNode === "StringLiteral")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Declaration" ||
    nodeType === "FunctionDeclaration" ||
    nodeType === "VariableDeclaration" ||
    nodeType === "ClassDeclaration" ||
    nodeType === "ExportAllDeclaration" ||
    nodeType === "ExportDefaultDeclaration" ||
    nodeType === "ExportNamedDeclaration" ||
    nodeType === "ImportDeclaration" ||
    nodeType === "DeclareClass" ||
    nodeType === "DeclareFunction" ||
    nodeType === "DeclareInterface" ||
    nodeType === "DeclareModule" ||
    nodeType === "DeclareModuleExports" ||
    nodeType === "DeclareTypeAlias" ||
    nodeType === "DeclareOpaqueType" ||
    nodeType === "DeclareVariable" ||
    nodeType === "DeclareExportDeclaration" ||
    nodeType === "DeclareExportAllDeclaration" ||
    nodeType === "InterfaceDeclaration" ||
    nodeType === "OpaqueType" ||
    nodeType === "TypeAlias" ||
    nodeType === "TSDeclareFunction" ||
    nodeType === "TSInterfaceDeclaration" ||
    nodeType === "TSTypeAliasDeclaration" ||
    nodeType === "TSEnumDeclaration" ||
    nodeType === "TSModuleDeclaration" ||
    (nodeType === "Placeholder" && node.expectedNode === "Declaration")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPatternLike(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "PatternLike" ||
    nodeType === "Identifier" ||
    nodeType === "RestElement" ||
    nodeType === "AssignmentPattern" ||
    nodeType === "ArrayPattern" ||
    nodeType === "ObjectPattern" ||
    (nodeType === "Placeholder" &&
      (node.expectedNode === "Pattern" || node.expectedNode === "Identifier"))
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isLVal(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "LVal" ||
    nodeType === "Identifier" ||
    nodeType === "MemberExpression" ||
    nodeType === "RestElement" ||
    nodeType === "AssignmentPattern" ||
    nodeType === "ArrayPattern" ||
    nodeType === "ObjectPattern" ||
    nodeType === "TSParameterProperty" ||
    (nodeType === "Placeholder" &&
      (node.expectedNode === "Pattern" || node.expectedNode === "Identifier"))
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSEntityName(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "TSEntityName" ||
    nodeType === "Identifier" ||
    nodeType === "TSQualifiedName" ||
    (nodeType === "Placeholder" && node.expectedNode === "Identifier")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isLiteral(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Literal" ||
    nodeType === "StringLiteral" ||
    nodeType === "NumericLiteral" ||
    nodeType === "NullLiteral" ||
    nodeType === "BooleanLiteral" ||
    nodeType === "RegExpLiteral" ||
    nodeType === "TemplateLiteral" ||
    nodeType === "BigIntLiteral" ||
    (nodeType === "Placeholder" && node.expectedNode === "StringLiteral")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isImmutable(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Immutable" ||
    nodeType === "StringLiteral" ||
    nodeType === "NumericLiteral" ||
    nodeType === "NullLiteral" ||
    nodeType === "BooleanLiteral" ||
    nodeType === "JSXAttribute" ||
    nodeType === "JSXClosingElement" ||
    nodeType === "JSXElement" ||
    nodeType === "JSXExpressionContainer" ||
    nodeType === "JSXSpreadChild" ||
    nodeType === "JSXOpeningElement" ||
    nodeType === "JSXText" ||
    nodeType === "JSXFragment" ||
    nodeType === "JSXOpeningFragment" ||
    nodeType === "JSXClosingFragment" ||
    nodeType === "BigIntLiteral" ||
    (nodeType === "Placeholder" && node.expectedNode === "StringLiteral")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isUserWhitespacable(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "UserWhitespacable" ||
    nodeType === "ObjectMethod" ||
    nodeType === "ObjectProperty" ||
    nodeType === "ObjectTypeInternalSlot" ||
    nodeType === "ObjectTypeCallProperty" ||
    nodeType === "ObjectTypeIndexer" ||
    nodeType === "ObjectTypeProperty" ||
    nodeType === "ObjectTypeSpreadProperty"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isMethod(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Method" ||
    nodeType === "ObjectMethod" ||
    nodeType === "ClassMethod" ||
    nodeType === "ClassPrivateMethod"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isObjectMember(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "ObjectMember" ||
    nodeType === "ObjectMethod" ||
    nodeType === "ObjectProperty"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isProperty(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Property" ||
    nodeType === "ObjectProperty" ||
    nodeType === "ClassProperty" ||
    nodeType === "ClassPrivateProperty"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isUnaryLike(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "UnaryLike" ||
    nodeType === "UnaryExpression" ||
    nodeType === "SpreadElement"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPattern(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Pattern" ||
    nodeType === "AssignmentPattern" ||
    nodeType === "ArrayPattern" ||
    nodeType === "ObjectPattern" ||
    (nodeType === "Placeholder" && node.expectedNode === "Pattern")
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isClass(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Class" ||
    nodeType === "ClassDeclaration" ||
    nodeType === "ClassExpression"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isModuleDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "ModuleDeclaration" ||
    nodeType === "ExportAllDeclaration" ||
    nodeType === "ExportDefaultDeclaration" ||
    nodeType === "ExportNamedDeclaration" ||
    nodeType === "ImportDeclaration"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isExportDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "ExportDeclaration" ||
    nodeType === "ExportAllDeclaration" ||
    nodeType === "ExportDefaultDeclaration" ||
    nodeType === "ExportNamedDeclaration"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isModuleSpecifier(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "ModuleSpecifier" ||
    nodeType === "ExportSpecifier" ||
    nodeType === "ImportDefaultSpecifier" ||
    nodeType === "ImportNamespaceSpecifier" ||
    nodeType === "ImportSpecifier" ||
    nodeType === "ExportDefaultSpecifier" ||
    nodeType === "ExportNamespaceSpecifier"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFlow(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Flow" ||
    nodeType === "AnyTypeAnnotation" ||
    nodeType === "ArrayTypeAnnotation" ||
    nodeType === "BooleanTypeAnnotation" ||
    nodeType === "BooleanLiteralTypeAnnotation" ||
    nodeType === "NullLiteralTypeAnnotation" ||
    nodeType === "ClassImplements" ||
    nodeType === "DeclareClass" ||
    nodeType === "DeclareFunction" ||
    nodeType === "DeclareInterface" ||
    nodeType === "DeclareModule" ||
    nodeType === "DeclareModuleExports" ||
    nodeType === "DeclareTypeAlias" ||
    nodeType === "DeclareOpaqueType" ||
    nodeType === "DeclareVariable" ||
    nodeType === "DeclareExportDeclaration" ||
    nodeType === "DeclareExportAllDeclaration" ||
    nodeType === "DeclaredPredicate" ||
    nodeType === "ExistsTypeAnnotation" ||
    nodeType === "FunctionTypeAnnotation" ||
    nodeType === "FunctionTypeParam" ||
    nodeType === "GenericTypeAnnotation" ||
    nodeType === "InferredPredicate" ||
    nodeType === "InterfaceExtends" ||
    nodeType === "InterfaceDeclaration" ||
    nodeType === "InterfaceTypeAnnotation" ||
    nodeType === "IntersectionTypeAnnotation" ||
    nodeType === "MixedTypeAnnotation" ||
    nodeType === "EmptyTypeAnnotation" ||
    nodeType === "NullableTypeAnnotation" ||
    nodeType === "NumberLiteralTypeAnnotation" ||
    nodeType === "NumberTypeAnnotation" ||
    nodeType === "ObjectTypeAnnotation" ||
    nodeType === "ObjectTypeInternalSlot" ||
    nodeType === "ObjectTypeCallProperty" ||
    nodeType === "ObjectTypeIndexer" ||
    nodeType === "ObjectTypeProperty" ||
    nodeType === "ObjectTypeSpreadProperty" ||
    nodeType === "OpaqueType" ||
    nodeType === "QualifiedTypeIdentifier" ||
    nodeType === "StringLiteralTypeAnnotation" ||
    nodeType === "StringTypeAnnotation" ||
    nodeType === "ThisTypeAnnotation" ||
    nodeType === "TupleTypeAnnotation" ||
    nodeType === "TypeofTypeAnnotation" ||
    nodeType === "TypeAlias" ||
    nodeType === "TypeAnnotation" ||
    nodeType === "TypeCastExpression" ||
    nodeType === "TypeParameter" ||
    nodeType === "TypeParameterDeclaration" ||
    nodeType === "TypeParameterInstantiation" ||
    nodeType === "UnionTypeAnnotation" ||
    nodeType === "Variance" ||
    nodeType === "VoidTypeAnnotation"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFlowType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "FlowType" ||
    nodeType === "AnyTypeAnnotation" ||
    nodeType === "ArrayTypeAnnotation" ||
    nodeType === "BooleanTypeAnnotation" ||
    nodeType === "BooleanLiteralTypeAnnotation" ||
    nodeType === "NullLiteralTypeAnnotation" ||
    nodeType === "ExistsTypeAnnotation" ||
    nodeType === "FunctionTypeAnnotation" ||
    nodeType === "GenericTypeAnnotation" ||
    nodeType === "InterfaceTypeAnnotation" ||
    nodeType === "IntersectionTypeAnnotation" ||
    nodeType === "MixedTypeAnnotation" ||
    nodeType === "EmptyTypeAnnotation" ||
    nodeType === "NullableTypeAnnotation" ||
    nodeType === "NumberLiteralTypeAnnotation" ||
    nodeType === "NumberTypeAnnotation" ||
    nodeType === "ObjectTypeAnnotation" ||
    nodeType === "StringLiteralTypeAnnotation" ||
    nodeType === "StringTypeAnnotation" ||
    nodeType === "ThisTypeAnnotation" ||
    nodeType === "TupleTypeAnnotation" ||
    nodeType === "TypeofTypeAnnotation" ||
    nodeType === "UnionTypeAnnotation" ||
    nodeType === "VoidTypeAnnotation"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFlowBaseAnnotation(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "FlowBaseAnnotation" ||
    nodeType === "AnyTypeAnnotation" ||
    nodeType === "BooleanTypeAnnotation" ||
    nodeType === "NullLiteralTypeAnnotation" ||
    nodeType === "MixedTypeAnnotation" ||
    nodeType === "EmptyTypeAnnotation" ||
    nodeType === "NumberTypeAnnotation" ||
    nodeType === "StringTypeAnnotation" ||
    nodeType === "ThisTypeAnnotation" ||
    nodeType === "VoidTypeAnnotation"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFlowDeclaration(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "FlowDeclaration" ||
    nodeType === "DeclareClass" ||
    nodeType === "DeclareFunction" ||
    nodeType === "DeclareInterface" ||
    nodeType === "DeclareModule" ||
    nodeType === "DeclareModuleExports" ||
    nodeType === "DeclareTypeAlias" ||
    nodeType === "DeclareOpaqueType" ||
    nodeType === "DeclareVariable" ||
    nodeType === "DeclareExportDeclaration" ||
    nodeType === "DeclareExportAllDeclaration" ||
    nodeType === "InterfaceDeclaration" ||
    nodeType === "OpaqueType" ||
    nodeType === "TypeAlias"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isFlowPredicate(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "FlowPredicate" ||
    nodeType === "DeclaredPredicate" ||
    nodeType === "InferredPredicate"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isJSX(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "JSX" ||
    nodeType === "JSXAttribute" ||
    nodeType === "JSXClosingElement" ||
    nodeType === "JSXElement" ||
    nodeType === "JSXEmptyExpression" ||
    nodeType === "JSXExpressionContainer" ||
    nodeType === "JSXSpreadChild" ||
    nodeType === "JSXIdentifier" ||
    nodeType === "JSXMemberExpression" ||
    nodeType === "JSXNamespacedName" ||
    nodeType === "JSXOpeningElement" ||
    nodeType === "JSXSpreadAttribute" ||
    nodeType === "JSXText" ||
    nodeType === "JSXFragment" ||
    nodeType === "JSXOpeningFragment" ||
    nodeType === "JSXClosingFragment"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isPrivate(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "Private" ||
    nodeType === "ClassPrivateProperty" ||
    nodeType === "ClassPrivateMethod" ||
    nodeType === "PrivateName"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSTypeElement(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "TSTypeElement" ||
    nodeType === "TSCallSignatureDeclaration" ||
    nodeType === "TSConstructSignatureDeclaration" ||
    nodeType === "TSPropertySignature" ||
    nodeType === "TSMethodSignature" ||
    nodeType === "TSIndexSignature"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isTSType(node: ?Object, opts?: Object): boolean {
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (
        nodeType === "TSType" ||
    nodeType === "TSAnyKeyword" ||
    nodeType === "TSUnknownKeyword" ||
    nodeType === "TSNumberKeyword" ||
    nodeType === "TSObjectKeyword" ||
    nodeType === "TSBooleanKeyword" ||
    nodeType === "TSStringKeyword" ||
    nodeType === "TSSymbolKeyword" ||
    nodeType === "TSVoidKeyword" ||
    nodeType === "TSUndefinedKeyword" ||
    nodeType === "TSNullKeyword" ||
    nodeType === "TSNeverKeyword" ||
    nodeType === "TSThisType" ||
    nodeType === "TSFunctionType" ||
    nodeType === "TSConstructorType" ||
    nodeType === "TSTypeReference" ||
    nodeType === "TSTypePredicate" ||
    nodeType === "TSTypeQuery" ||
    nodeType === "TSTypeLiteral" ||
    nodeType === "TSArrayType" ||
    nodeType === "TSTupleType" ||
    nodeType === "TSOptionalType" ||
    nodeType === "TSRestType" ||
    nodeType === "TSUnionType" ||
    nodeType === "TSIntersectionType" ||
    nodeType === "TSConditionalType" ||
    nodeType === "TSInferType" ||
    nodeType === "TSParenthesizedType" ||
    nodeType === "TSTypeOperator" ||
    nodeType === "TSIndexedAccessType" ||
    nodeType === "TSMappedType" ||
    nodeType === "TSLiteralType" ||
    nodeType === "TSExpressionWithTypeArguments" ||
    nodeType === "TSImportType"
    ) {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isNumberLiteral(node: ?Object, opts?: Object): boolean {
    console.trace(
        "The node type NumberLiteral has been renamed to NumericLiteral",
    );
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "NumberLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isRegexLiteral(node: ?Object, opts?: Object): boolean {
    console.trace("The node type RegexLiteral has been renamed to RegExpLiteral");
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "RegexLiteral") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isRestProperty(node: ?Object, opts?: Object): boolean {
    console.trace("The node type RestProperty has been renamed to RestElement");
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "RestProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
export function isSpreadProperty(node: ?Object, opts?: Object): boolean {
    console.trace(
        "The node type SpreadProperty has been renamed to SpreadElement",
    );
    if (!node) {
        return false; 
    }

    const nodeType = node.type;
    if (nodeType === "SpreadProperty") {
        if (is.undefined(opts)) {
            return true;
        } 
        return shallowEqual(node, opts);
    
    }

    return false;
}
