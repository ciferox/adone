import { NodeBase } from "./shared/Node";
import { hasMemberEffectWhenCalled, arrayMembers, someMemberReturnExpressionWhenCalled } from "../values";

export default class ArrayExpression extends NodeBase {
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }

    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(arrayMembers, path[0], callOptions, options);
        }
        return true;
    }

    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (path.length === 1) {
            return someMemberReturnExpressionWhenCalled(arrayMembers, path[0], callOptions, predicateFunction, options);
        }
        return true;
    }
}
