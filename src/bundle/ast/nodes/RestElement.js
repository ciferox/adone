import { EMPTY_PATH, UNKNOWN_EXPRESSION } from '../values';
import { NodeBase } from './shared/Node';
export default class RestElement extends NodeBase {
    declare(kind, _init) {
        this.argument.declare(kind, UNKNOWN_EXPRESSION);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        return path.length > 0 || this.argument.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options);
    }
    reassignPath(path, options) {
        path.length === 0 && this.argument.reassignPath(EMPTY_PATH, options);
    }
}
