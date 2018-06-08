import { BLANK } from '../../utils/blank';
import { getCommaSeparatedNodesWithBoundaries } from '../../utils/renderHelpers';
import { NodeBase } from './shared/Node';
export default class SequenceExpression extends NodeBase {
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        this.expressions[this.expressions.length - 1].forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
    }
    getLiteralValueAtPath(path, options) {
        return this.expressions[this.expressions.length - 1].getLiteralValueAtPath(path, options);
    }
    hasEffects(options) {
        for (const expression of this.expressions) {
            if (expression.hasEffects(options))
                return true;
        }
        return false;
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        return (path.length > 0 &&
            this.expressions[this.expressions.length - 1].hasEffectsWhenAccessedAtPath(path, options));
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        return (path.length === 0 ||
            this.expressions[this.expressions.length - 1].hasEffectsWhenAssignedAtPath(path, options));
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        return this.expressions[this.expressions.length - 1].hasEffectsWhenCalledAtPath(path, callOptions, options);
    }
    include() {
        this.included = true;
        for (let i = 0; i < this.expressions.length - 1; i++) {
            const node = this.expressions[i];
            if (node.shouldBeIncluded())
                node.include();
        }
        this.expressions[this.expressions.length - 1].include();
    }
    reassignPath(path, options) {
        if (path.length > 0)
            this.expressions[this.expressions.length - 1].reassignPath(path, options);
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent } = BLANK) {
        let firstStart = 0, lastEnd, includedNodes = 0;
        for (const { node, start, end } of getCommaSeparatedNodesWithBoundaries(this.expressions, code, this.start, this.end)) {
            if (!node.included) {
                code.remove(start, end);
                continue;
            }
            includedNodes++;
            if (firstStart === 0)
                firstStart = start;
            lastEnd = end;
            if (node === this.expressions[this.expressions.length - 1] && includedNodes === 1) {
                node.render(code, options, {
                    renderedParentType: renderedParentType || this.parent.type,
                    isCalleeOfRenderedParent: renderedParentType
                        ? isCalleeOfRenderedParent
                        : this.parent.callee === this
                });
            }
            else {
                node.render(code, options);
            }
        }
        // Round brackets are part of the actual parent and should be re-added in case the parent changed
        if (includedNodes > 1 && renderedParentType) {
            code.prependRight(firstStart, '(');
            code.appendLeft(lastEnd, ')');
        }
    }
}
