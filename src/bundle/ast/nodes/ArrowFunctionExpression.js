import ReturnValueScope from '../scopes/ReturnValueScope';
import Scope from '../scopes/Scope';
import BlockStatement from './BlockStatement';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';
export default class ArrowFunctionExpression extends NodeBase {
    createScope(parentScope) {
        this.scope = new ReturnValueScope({ parent: parentScope });
    }
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        path.length === 0 &&
            this.scope.forEachReturnExpressionWhenCalled(callOptions, callback, options);
    }
    hasEffects(_options) {
        return false;
    }
    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath(path, _options) {
        return path.length > 1;
    }
    hasEffectsWhenCalledAtPath(path, _callOptions, options) {
        if (path.length > 0) {
            return true;
        }
        for (const param of this.params) {
            if (param.hasEffects(options))
                return true;
        }
        return this.body.hasEffects(options);
    }
    initialise() {
        this.included = false;
        for (const param of this.params) {
            param.declare('parameter', null);
        }
        if (this.body instanceof BlockStatement) {
            this.body.addImplicitReturnExpressionToScope();
        }
        else {
            this.scope.addReturnExpression(this.body);
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.body.type === NodeType.BlockStatement) {
            this.body = new this.context.nodeConstructors.BlockStatement(esTreeNode.body, this, new Scope({ parent: this.scope }));
        }
        super.parseNode(esTreeNode);
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        return (path.length > 0 ||
            this.scope.someReturnExpressionWhenCalled(callOptions, predicateFunction, options));
    }
}
ArrowFunctionExpression.prototype.preventChildBlockScope = true;
