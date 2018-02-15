import ExecutionPathOptions from "../ExecutionPathOptions";
import { NodeBase } from "./shared/Node";
export default class AssignmentExpression extends NodeBase {
    bindNode() {
        this.left.reassignPath([], ExecutionPathOptions.create());
    }

    hasEffects(options) {
        return (super.hasEffects(options) ||
            this.left.hasEffectsWhenAssignedAtPath([], options));
    }

    hasEffectsWhenAccessedAtPath(path, options) {
        return (path.length > 0 && this.right.hasEffectsWhenAccessedAtPath(path, options));
    }
}
