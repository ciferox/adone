import ExecutionPathOptions from "../ExecutionPathOptions";
import { NodeBase } from "./shared/Node";
export default class AssignmentPattern extends NodeBase {
    bindNode() {
        this.left.reassignPath([], ExecutionPathOptions.create());
    }

    reassignPath(path, options) {
        path.length === 0 && this.left.reassignPath(path, options);
    }

    hasEffectsWhenAssignedAtPath(path, options) {
        return (path.length > 0 || this.left.hasEffectsWhenAssignedAtPath([], options));
    }

    initialiseAndDeclare(parentScope, kind, init) {
        this.initialiseScope(parentScope);
        this.right.initialise(parentScope);
        this.left.initialiseAndDeclare(parentScope, kind, init);
    }
}
