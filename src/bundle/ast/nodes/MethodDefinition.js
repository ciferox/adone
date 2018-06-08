import { EMPTY_PATH } from '../values';
import { NodeBase } from './shared/Node';
export default class MethodDefinition extends NodeBase {
    hasEffects(options) {
        return this.key.hasEffects(options);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        return (path.length > 0 || this.value.hasEffectsWhenCalledAtPath(EMPTY_PATH, callOptions, options));
    }
}
