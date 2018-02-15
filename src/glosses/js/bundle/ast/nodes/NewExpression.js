import CallOptions from "../CallOptions";
import { NodeBase } from "./shared/Node";
export default class NewExpression extends NodeBase {
    hasEffects(options) {
        return (this.arguments.some((child) => child.hasEffects(options)) ||
            this.callee.hasEffectsWhenCalledAtPath([], this._callOptions, options.getHasEffectsWhenCalledOptions()));
    }

    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }

    initialiseNode() {
        this._callOptions = CallOptions.create({
            withNew: true,
            args: this.arguments,
            callIdentifier: this
        });
    }
}
