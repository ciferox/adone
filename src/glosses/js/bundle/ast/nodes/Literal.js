import { NodeBase } from "./shared/Node";
import { getLiteralMembersForValue, hasMemberEffectWhenCalled, someMemberReturnExpressionWhenCalled } from "../values";

const {
    is
} = adone;

export const isLiteral = (node) => node.type === "Literal";

export default class Literal extends NodeBase {
    getValue() {
        return this.value;
    }

    hasEffectsWhenAccessedAtPath(path, _options) {
        if (is.null(this.value)) {
            return path.length > 0;
        }
        return path.length > 1;
    }

    hasEffectsWhenAssignedAtPath(path, _options) {
        return path.length > 0;
    }

    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(this.members, path[0], callOptions, options);
        }
        return true;
    }

    initialiseNode() {
        this.members = getLiteralMembersForValue(this.value);
    }

    render(code, _options) {
        if (is.string(this.value)) {
            code.indentExclusionRanges.push([this.start + 1, this.end - 1]); // TODO TypeScript: Awaiting MagicString PR
        }
    }

    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (path.length === 1) {
            return someMemberReturnExpressionWhenCalled(this.members, path[0], callOptions, predicateFunction, options);
        }
        return true;
    }
}
