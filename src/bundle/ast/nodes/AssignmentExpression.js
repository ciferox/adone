import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { EMPTY_PATH, UNKNOWN_PATH } from '../values';
import { NodeBase } from './shared/Node';
export default class AssignmentExpression extends NodeBase {
    bind() {
        super.bind();
        this.left.reassignPath(EMPTY_PATH, NEW_EXECUTION_PATH);
        // We can not propagate mutations of the new binding to the old binding with certainty
        this.right.reassignPath(UNKNOWN_PATH, NEW_EXECUTION_PATH);
    }
    hasEffects(options) {
        return (this.right.hasEffects(options) ||
            this.left.hasEffects(options) ||
            this.left.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options));
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        return path.length > 0 && this.right.hasEffectsWhenAccessedAtPath(path, options);
    }
}
