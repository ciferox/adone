import { BLANK } from '../../utils/blank';
import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { EMPTY_PATH, UNKNOWN_VALUE } from '../values';
import { NodeBase } from './shared/Node';
export default class ConditionalExpression extends NodeBase {
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
        if (testValue === UNKNOWN_VALUE || testValue) {
            this.consequent.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
        if (testValue === UNKNOWN_VALUE || !testValue) {
            this.alternate.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
    }
    getLiteralValueAtPath(path, options) {
        const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
        if (testValue === UNKNOWN_VALUE)
            return UNKNOWN_VALUE;
        return testValue
            ? this.consequent.getLiteralValueAtPath(path, options)
            : this.alternate.getLiteralValueAtPath(path, options);
    }
    hasEffects(options) {
        if (this.test.hasEffects(options))
            return true;
        const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
        if (testValue === UNKNOWN_VALUE) {
            return this.consequent.hasEffects(options) || this.alternate.hasEffects(options);
        }
        return testValue ? this.consequent.hasEffects(options) : this.alternate.hasEffects(options);
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        if (path.length === 0)
            return false;
        const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
        if (testValue === UNKNOWN_VALUE) {
            return (this.consequent.hasEffectsWhenAccessedAtPath(path, options) ||
                this.alternate.hasEffectsWhenAccessedAtPath(path, options));
        }
        return testValue
            ? this.consequent.hasEffectsWhenAccessedAtPath(path, options)
            : this.alternate.hasEffectsWhenAccessedAtPath(path, options);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        if (path.length === 0)
            return true;
        const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
        if (testValue === UNKNOWN_VALUE) {
            return (this.consequent.hasEffectsWhenAssignedAtPath(path, options) ||
                this.alternate.hasEffectsWhenAssignedAtPath(path, options));
        }
        return testValue
            ? this.consequent.hasEffectsWhenAssignedAtPath(path, options)
            : this.alternate.hasEffectsWhenAssignedAtPath(path, options);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
        if (testValue === UNKNOWN_VALUE) {
            return (this.consequent.hasEffectsWhenCalledAtPath(path, callOptions, options) ||
                this.alternate.hasEffectsWhenCalledAtPath(path, callOptions, options));
        }
        return testValue
            ? this.consequent.hasEffectsWhenCalledAtPath(path, callOptions, options)
            : this.alternate.hasEffectsWhenCalledAtPath(path, callOptions, options);
    }
    initialise() {
        this.included = false;
        this.hasUnknownTestValue = false;
    }
    include() {
        this.included = true;
        const testValue = this.hasUnknownTestValue
            ? UNKNOWN_VALUE
            : this.getTestValue(NEW_EXECUTION_PATH);
        if (testValue === UNKNOWN_VALUE || this.test.shouldBeIncluded()) {
            this.test.include();
            this.consequent.include();
            this.alternate.include();
        }
        else if (testValue) {
            this.consequent.include();
        }
        else {
            this.alternate.include();
        }
    }
    reassignPath(path, options) {
        if (path.length > 0) {
            const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
            if (testValue === UNKNOWN_VALUE || testValue) {
                this.consequent.reassignPath(path, options);
            }
            if (testValue === UNKNOWN_VALUE || !testValue) {
                this.alternate.reassignPath(path, options);
            }
        }
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent } = BLANK) {
        if (!this.test.included) {
            const singleRetainedBranch = this.consequent.included ? this.consequent : this.alternate;
            code.remove(this.start, singleRetainedBranch.start);
            code.remove(singleRetainedBranch.end, this.end);
            singleRetainedBranch.render(code, options, {
                renderedParentType: renderedParentType || this.parent.type,
                isCalleeOfRenderedParent: renderedParentType
                    ? isCalleeOfRenderedParent
                    : this.parent.callee === this
            });
        }
        else {
            super.render(code, options);
        }
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        const testValue = this.hasUnknownTestValue ? UNKNOWN_VALUE : this.getTestValue(options);
        if (testValue === UNKNOWN_VALUE) {
            return (this.consequent.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) ||
                this.alternate.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options));
        }
        return testValue
            ? this.consequent.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options)
            : this.alternate.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options);
    }
    getTestValue(options) {
        if (this.hasUnknownTestValue)
            return UNKNOWN_VALUE;
        const value = this.test.getLiteralValueAtPath(EMPTY_PATH, options);
        if (value === UNKNOWN_VALUE) {
            this.hasUnknownTestValue = true;
        }
        return value;
    }
}
