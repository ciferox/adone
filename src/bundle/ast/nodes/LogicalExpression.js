import { BLANK } from '../../utils/blank';
import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { EMPTY_PATH, UNKNOWN_VALUE } from '../values';
import { NodeBase } from './shared/Node';
export default class LogicalExpression extends NodeBase {
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
        if (leftValue === UNKNOWN_VALUE) {
            this.left.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
            this.right.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
        else if (this.isOrExpression ? leftValue : !leftValue) {
            this.left.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
        else {
            this.right.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
    }
    getLiteralValueAtPath(path, options) {
        const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
        if (leftValue === UNKNOWN_VALUE)
            return UNKNOWN_VALUE;
        if (this.isOrExpression ? leftValue : !leftValue)
            return leftValue;
        return this.right.getLiteralValueAtPath(path, options);
    }
    hasEffects(options) {
        if (this.left.hasEffects(options))
            return true;
        const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
        return ((leftValue === UNKNOWN_VALUE || (this.isOrExpression ? !leftValue : leftValue)) &&
            this.right.hasEffects(options));
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        if (path.length === 0)
            return false;
        const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
        if (leftValue === UNKNOWN_VALUE) {
            return (this.left.hasEffectsWhenAccessedAtPath(path, options) ||
                this.right.hasEffectsWhenAccessedAtPath(path, options));
        }
        return (this.isOrExpression
            ? leftValue
            : !leftValue)
            ? this.left.hasEffectsWhenAccessedAtPath(path, options)
            : this.right.hasEffectsWhenAccessedAtPath(path, options);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        if (path.length === 0)
            return true;
        const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
        if (leftValue === UNKNOWN_VALUE) {
            return (this.left.hasEffectsWhenAssignedAtPath(path, options) ||
                this.right.hasEffectsWhenAssignedAtPath(path, options));
        }
        return (this.isOrExpression
            ? leftValue
            : !leftValue)
            ? this.left.hasEffectsWhenAssignedAtPath(path, options)
            : this.right.hasEffectsWhenAssignedAtPath(path, options);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
        if (leftValue === UNKNOWN_VALUE) {
            return (this.left.hasEffectsWhenCalledAtPath(path, callOptions, options) ||
                this.right.hasEffectsWhenCalledAtPath(path, callOptions, options));
        }
        return (this.isOrExpression
            ? leftValue
            : !leftValue)
            ? this.left.hasEffectsWhenCalledAtPath(path, callOptions, options)
            : this.right.hasEffectsWhenCalledAtPath(path, callOptions, options);
    }
    include() {
        this.included = true;
        const leftValue = this.hasUnknownLeftValue
            ? UNKNOWN_VALUE
            : this.getLeftValue(NEW_EXECUTION_PATH);
        if (leftValue === UNKNOWN_VALUE ||
            (this.isOrExpression ? leftValue : !leftValue) ||
            this.left.shouldBeIncluded()) {
            this.left.include();
        }
        if (leftValue === UNKNOWN_VALUE || (this.isOrExpression ? !leftValue : leftValue)) {
            this.right.include();
        }
    }
    initialise() {
        this.included = false;
        this.hasUnknownLeftValue = false;
        this.isOrExpression = this.operator === '||';
    }
    reassignPath(path, options) {
        if (path.length > 0) {
            const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
            if (leftValue === UNKNOWN_VALUE) {
                this.left.reassignPath(path, options);
                this.right.reassignPath(path, options);
            }
            else if (this.isOrExpression ? leftValue : !leftValue) {
                this.left.reassignPath(path, options);
            }
            else {
                this.right.reassignPath(path, options);
            }
        }
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent } = BLANK) {
        if (!this.left.included || !this.right.included) {
            const singleRetainedBranch = this.left.included ? this.left : this.right;
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
        const leftValue = this.hasUnknownLeftValue ? UNKNOWN_VALUE : this.getLeftValue(options);
        if (leftValue === UNKNOWN_VALUE) {
            return (this.left.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) ||
                this.right.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options));
        }
        return (this.isOrExpression
            ? leftValue
            : !leftValue)
            ? this.left.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options)
            : this.right.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options);
    }
    getLeftValue(options) {
        if (this.hasUnknownLeftValue)
            return UNKNOWN_VALUE;
        const value = this.left.getLiteralValueAtPath(EMPTY_PATH, options);
        if (value === UNKNOWN_VALUE) {
            this.hasUnknownLeftValue = true;
        }
        return value;
    }
}
