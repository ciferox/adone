import { NodeBase } from "./shared/Node";
export default class ObjectPattern extends NodeBase {
    reassignPath(path, options) {
        path.length === 0 &&
            this.properties.forEach((child) => child.reassignPath(path, options));
    }

    hasEffectsWhenAssignedAtPath(path, options) {
        return (path.length > 0 ||
            this.properties.some((child) => child.hasEffectsWhenAssignedAtPath([], options)));
    }

    initialiseAndDeclare(parentScope, kind, init) {
        this.initialiseScope(parentScope);
        this.properties.forEach((child) => child.initialiseAndDeclare(parentScope, kind, init));
    }
}
