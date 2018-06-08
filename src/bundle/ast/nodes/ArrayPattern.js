import { EMPTY_PATH, UNKNOWN_EXPRESSION } from '../values';
import { NodeBase } from './shared/Node';
export default class ArrayPattern extends NodeBase {
    declare(kind, _init) {
        for (const element of this.elements) {
            if (element !== null) {
                element.declare(kind, UNKNOWN_EXPRESSION);
            }
        }
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        if (path.length > 0)
            return true;
        for (const element of this.elements) {
            if (element !== null && element.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options))
                return true;
        }
        return false;
    }
    reassignPath(path, options) {
        if (path.length === 0) {
            for (const element of this.elements) {
                if (element !== null) {
                    element.reassignPath(path, options);
                }
            }
        }
    }
}
