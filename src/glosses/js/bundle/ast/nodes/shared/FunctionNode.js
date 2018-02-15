import FunctionScope from "../../scopes/FunctionScope";
import { NodeBase } from "./Node";
export default class FunctionNode extends NodeBase {
    bindNode() {
        this.body.bindImplicitReturnExpressionToScope();
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
        if (path[0] === "prototype") {
            return path.length > 2;
        }
        return true;
    }

    hasEffectsWhenAssignedAtPath(path) {
        if (path.length <= 1) {
            return false;
        }
        if (path[0] === "prototype") {
            return path.length > 2;
        }
        return true;
    }

    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length > 0) {
            return true;
        }
        const innerOptions = this.scope.getOptionsWhenCalledWith(callOptions, options);
        return (this.params.some((param) => param.hasEffects(innerOptions)) ||
            this.body.hasEffects(innerOptions));
    }

    includeInBundle() {
        this.scope.variables.arguments.includeVariable();
        return super.includeInBundle();
    }

    initialiseScope(parentScope) {
        this.scope = new FunctionScope({ parent: parentScope });
    }

    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        return (path.length > 0 ||
            this.scope.someReturnExpressionWhenCalled(callOptions, predicateFunction, options));
    }
}
