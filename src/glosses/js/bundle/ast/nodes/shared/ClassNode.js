import Scope from "../../scopes/Scope";
import { NodeBase } from "./Node";
export default class ClassNode extends NodeBase {
    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }

    hasEffectsWhenAssignedAtPath(path, _options) {
        return path.length > 1;
    }

    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        return (this.body.hasEffectsWhenCalledAtPath(path, callOptions, options) ||
            (this.superClass &&
                this.superClass.hasEffectsWhenCalledAtPath(path, callOptions, options)));
    }

    initialiseChildren(_parentScope) {
        if (this.superClass) {
            this.superClass.initialise(this.scope);
        }
        this.body.initialise(this.scope);
    }

    initialiseScope(parentScope) {
        this.scope = new Scope({ parent: parentScope });
    }
}
