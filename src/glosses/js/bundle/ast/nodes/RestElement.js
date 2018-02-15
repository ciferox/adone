import { UNKNOWN_EXPRESSION } from "../values";
import { NodeBase } from "./shared/Node";
export default class RestElement extends NodeBase {
    reassignPath(path, options) {
        path.length === 0 && this.argument.reassignPath([], options);
    }

    hasEffectsWhenAssignedAtPath(path, options) {
        return (path.length > 0 || this.argument.hasEffectsWhenAssignedAtPath([], options));
    }

    initialiseAndDeclare(parentScope, kind, _init) {
        this.initialiseScope(parentScope);
        this.argument.initialiseAndDeclare(parentScope, kind, UNKNOWN_EXPRESSION);
    }
}
