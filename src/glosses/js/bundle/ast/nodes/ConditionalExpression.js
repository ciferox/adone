import { UNKNOWN_VALUE } from "../values";
import { NodeBase } from "./shared/Node";
export default class ConditionalExpression extends NodeBase {
    reassignPath(path, options) {
        path.length > 0 &&
            this.forEachRelevantBranch((node) => node.reassignPath(path, options));
    }

    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        this.forEachRelevantBranch((node) => node.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options));
    }

    getValue() {
        const testValue = this.test.getValue();
        if (testValue === UNKNOWN_VALUE) {
            return UNKNOWN_VALUE; 
        }
        return testValue ? this.consequent.getValue() : this.alternate.getValue();
    }

    hasEffects(options) {
        return (this.test.hasEffects(options) ||
            this.someRelevantBranch((node) => node.hasEffects(options)));
    }

    hasEffectsWhenAccessedAtPath(path, options) {
        return (path.length > 0 &&
            this.someRelevantBranch((node) => node.hasEffectsWhenAccessedAtPath(path, options)));
    }

    hasEffectsWhenAssignedAtPath(path, options) {
        return (path.length === 0 ||
            this.someRelevantBranch((node) => node.hasEffectsWhenAssignedAtPath(path, options)));
    }

    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        return this.someRelevantBranch((node) => node.hasEffectsWhenCalledAtPath(path, callOptions, options));
    }

    initialiseChildren(parentScope) {
        super.initialiseChildren(parentScope);
        if (this.module.graph.treeshake) {
            this.testValue = this.test.getValue();
            if (this.testValue === UNKNOWN_VALUE) {
                
            } else if (this.testValue) {
                this.alternate = null;
            } else if (this.alternate) {
                this.consequent = null;
            }
        }
    }

    render(code, options) {
        if (!this.module.graph.treeshake) {
            super.render(code, options);
        } else {
            if (this.testValue === UNKNOWN_VALUE) {
                super.render(code, options);
            } else {
                const branchToRetain = this.testValue
                    ? this.consequent
                    : this.alternate;
                code.remove(this.start, branchToRetain.start);
                code.remove(branchToRetain.end, this.end);
                if (branchToRetain.type === "SequenceExpression" /* SequenceExpression */) {
                    code.prependLeft(branchToRetain.start, "(");
                    code.appendRight(branchToRetain.end, ")");
                }
                branchToRetain.render(code, options);
            }
        }
    }

    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        return this.someRelevantBranch((node) => node.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options));
    }

    forEachRelevantBranch(callback) {
        if (this.testValue === UNKNOWN_VALUE) {
            callback(this.consequent);
            callback(this.alternate);
        } else {
            this.testValue ? callback(this.consequent) : callback(this.alternate);
        }
    }

    someRelevantBranch(predicateFunction) {
        return this.testValue === UNKNOWN_VALUE
            ? predicateFunction(this.consequent) || predicateFunction(this.alternate)
            : this.testValue
                ? predicateFunction(this.consequent)
                : predicateFunction(this.alternate);
    }
}
