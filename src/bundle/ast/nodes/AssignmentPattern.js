import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { EMPTY_PATH } from '../values';
import { NodeBase } from './shared/Node';
export default class AssignmentPattern extends NodeBase {
    bind() {
        super.bind();
        this.left.reassignPath(EMPTY_PATH, NEW_EXECUTION_PATH);
    }
    declare(kind, init) {
        this.left.declare(kind, init);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        return path.length > 0 || this.left.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options);
    }
    reassignPath(path, options) {
        path.length === 0 && this.left.reassignPath(path, options);
    }
}
