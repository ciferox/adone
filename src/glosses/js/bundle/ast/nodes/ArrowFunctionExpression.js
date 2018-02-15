import Scope from "../scopes/Scope";
import ReturnValueScope from "../scopes/ReturnValueScope";
import { isBlockStatement } from "./BlockStatement";
import { NodeBase } from "./shared/Node";
export default class ArrowFunctionExpression extends NodeBase {
    bindNode() {
        isBlockStatement(this.body)
            ? this.body.bindImplicitReturnExpressionToScope()
            : this.scope.addReturnExpression(this.body);
    }

    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        path.length === 0
            && this.scope.forEachReturnExpressionWhenCalled(callOptions, callback, options);
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
        return (this.params.some((param) => param.hasEffects(options)) ||
            this.body.hasEffects(options));
    }

    initialiseChildren() {
        this.params.forEach((param) => param.initialiseAndDeclare(this.scope, "parameter", null));
        if (this.body.initialiseAndReplaceScope) {
            this.body.initialiseAndReplaceScope(new Scope({ parent: this.scope }));
        } else {
            this.body.initialise(this.scope);
        }
    }

    initialiseScope(parentScope) {
        this.scope = new ReturnValueScope({ parent: parentScope });
    }

    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        return (path.length > 0 ||
            this.scope.someReturnExpressionWhenCalled(callOptions, predicateFunction, options));
    }
}
