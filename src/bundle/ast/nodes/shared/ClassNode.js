import Scope from '../../scopes/Scope';
import { NodeBase } from './Node';
export default class ClassNode extends NodeBase {
    createScope(parentScope) {
        this.scope = new Scope({ parent: parentScope });
    }
    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath(path, _options) {
        return path.length > 1;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        return (this.body.hasEffectsWhenCalledAtPath(path, callOptions, options) ||
            (this.superClass && this.superClass.hasEffectsWhenCalledAtPath(path, callOptions, options)));
    }
    initialise() {
        this.included = false;
        if (this.id !== null) {
            this.id.declare('class', this);
        }
    }
}
