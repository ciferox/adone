import { EMPTY_PATH } from '../values';
import { NodeBase } from './shared/Node';
export default class ClassBody extends NodeBase {
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length > 0) {
            return true;
        }
        return (this.classConstructor !== null &&
            this.classConstructor.hasEffectsWhenCalledAtPath(EMPTY_PATH, callOptions, options));
    }
    initialise() {
        this.included = false;
        for (const method of this.body) {
            if (method.kind === 'constructor') {
                this.classConstructor = method;
                return;
            }
        }
        this.classConstructor = null;
    }
}
