import { getLiteralMembersForValue, hasMemberEffectWhenCalled, someMemberReturnExpressionWhenCalled, UNKNOWN_VALUE } from '../values';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';
export function isLiteral(node) {
    return node.type === NodeType.Literal;
}
export default class Literal extends NodeBase {
    getLiteralValueAtPath(path) {
        if (path.length > 0) {
            return UNKNOWN_VALUE;
        }
        // not sure why we need this type cast here
        return this.value;
    }
    hasEffectsWhenAccessedAtPath(path) {
        if (this.value === null) {
            return path.length > 0;
        }
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath(path) {
        return path.length > 0;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(this.members, path[0], this.included, callOptions, options);
        }
        return true;
    }
    initialise() {
        this.included = false;
        this.members = getLiteralMembersForValue(this.value);
    }
    render(code, _options) {
        if (typeof this.value === 'string') {
            code.indentExclusionRanges.push([this.start + 1, this.end - 1]);
        }
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (path.length === 1) {
            return someMemberReturnExpressionWhenCalled(this.members, path[0], callOptions, predicateFunction, options);
        }
        return true;
    }
}
