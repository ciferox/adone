import { UNKNOWN_EXPRESSION } from "../values";
import { NodeBase } from "./shared/Node";
export default class ArrayPattern extends NodeBase {
    reassignPath(path, options) {
        path.length === 0 &&
            this.elements.forEach((child) => child && child.reassignPath([], options));
    }

    hasEffectsWhenAssignedAtPath(path, options) {
        return (path.length > 0 ||
            this.elements.some((child) => child && child.hasEffectsWhenAssignedAtPath([], options)));
    }

    initialiseAndDeclare(parentScope, kind, _init) {
        this.initialiseScope(parentScope);
        this.elements.forEach((child) => child && child.initialiseAndDeclare(parentScope, kind, UNKNOWN_EXPRESSION));
    }
}
