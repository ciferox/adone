import FunctionScope from '../../scopes/FunctionScope';
import Scope from '../../scopes/Scope';
import { NodeBase } from './Node';
export default class FunctionNode extends NodeBase {
    createScope(parentScope) {
        this.scope = new FunctionScope({ parent: parentScope });
    }
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        path.length === 0 &&
            this.scope.forEachReturnExpressionWhenCalled(callOptions, callback, options);
    }
    hasEffects(options) {
        return this.id && this.id.hasEffects(options);
    }
    hasEffectsWhenAccessedAtPath(path) {
        if (path.length <= 1) {
            return false;
        }
        return path.length > 2 || path[0] !== 'prototype' || this.isPrototypeReassigned;
    }
    hasEffectsWhenAssignedAtPath(path) {
        if (path.length <= 1) {
            return false;
        }
        return path.length > 2 || path[0] !== 'prototype' || this.isPrototypeReassigned;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length > 0) {
            return true;
        }
        const innerOptions = this.scope.getOptionsWhenCalledWith(callOptions, options);
        for (const param of this.params) {
            if (param.hasEffects(innerOptions))
                return true;
        }
        return this.body.hasEffects(innerOptions);
    }
    include() {
        this.scope.variables.arguments.include();
        super.include();
    }
    initialise() {
        this.included = false;
        this.isPrototypeReassigned = false;
        if (this.id !== null) {
            this.id.declare('function', this);
        }
        for (const param of this.params) {
            param.declare('parameter', null);
        }
        this.body.addImplicitReturnExpressionToScope();
    }
    parseNode(esTreeNode) {
        this.body = new this.context.nodeConstructors.BlockStatement(esTreeNode.body, this, new Scope({ parent: this.scope }));
        super.parseNode(esTreeNode);
    }
    reassignPath(path) {
        if (path.length === 1 && path[0] === 'prototype') {
            this.isPrototypeReassigned = true;
        }
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        return (path.length > 0 ||
            this.scope.someReturnExpressionWhenCalled(callOptions, predicateFunction, options));
    }
}
FunctionNode.prototype.preventChildBlockScope = true;
