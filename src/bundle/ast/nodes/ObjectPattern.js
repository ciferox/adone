import { EMPTY_PATH } from '../values';
import { NodeBase } from './shared/Node';
export default class ObjectPattern extends NodeBase {
    declare(kind, init) {
        for (const property of this.properties) {
            property.declare(kind, init);
        }
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        if (path.length > 0)
            return true;
        for (const property of this.properties) {
            if (property.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options))
                return true;
        }
        return false;
    }
    reassignPath(path, options) {
        if (path.length === 0) {
            for (const property of this.properties) {
                property.reassignPath(path, options);
            }
        }
    }
}
