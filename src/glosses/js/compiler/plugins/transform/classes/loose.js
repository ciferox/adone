import VanillaTransformer from "./vanilla";

const {
    js: { compiler: { types: t, helper: { functionName } } }
} = adone;

export default class LooseClassTransformer extends VanillaTransformer {
    constructor() {
        super(...arguments);
        this._protoAlias = null;
        this.isLoose = true;
    }

    _insertProtoAliasOnce() {
        if (!this._protoAlias) {
            this._protoAlias = this.scope.generateUidIdentifier("proto");
            const classProto = t.memberExpression(
                this.classRef,
                t.identifier("prototype"),
            );
            const protoDeclaration = t.variableDeclaration("var", [
                t.variableDeclarator(this._protoAlias, classProto),
            ]);

            this.body.push(protoDeclaration);
        }
    }

    _processMethod(node, scope) {
        if (!node.decorators) {
            // use assignments instead of define properties for loose classes

            let classRef = this.classRef;
            if (!node.static) {
                this._insertProtoAliasOnce();
                classRef = this._protoAlias;
            }
            const methodName = t.memberExpression(
                t.cloneNode(classRef),
                node.key,
                node.computed || t.isLiteral(node.key),
            );

            let func = t.functionExpression(
                null,
                node.params,
                node.body,
                node.generator,
                node.async,
            );
            func.returnType = node.returnType;
            const key = t.toComputedKey(node, node.key);
            if (t.isStringLiteral(key)) {
                func = functionName({
                    node: func,
                    id: key,
                    scope,
                });
            }

            const expr = t.expressionStatement(
                t.assignmentExpression("=", methodName, func),
            );
            t.inheritsComments(expr, node);
            this.body.push(expr);
            return true;
        }
    }
}
