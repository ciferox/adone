import CallOptions from '../CallOptions';
import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { UNKNOWN_PATH } from '../values';
import { NodeBase } from './shared/Node';
export default class NewExpression extends NodeBase {
    bind() {
        super.bind();
        for (const argument of this.arguments) {
            // This will make sure all properties of parameters behave as "unknown"
            argument.reassignPath(UNKNOWN_PATH, NEW_EXECUTION_PATH);
        }
    }
    hasEffects(options) {
        for (const argument of this.arguments) {
            if (argument.hasEffects(options))
                return true;
        }
        return this.callee.hasEffectsWhenCalledAtPath([], this.callOptions, options.getHasEffectsWhenCalledOptions());
    }
    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }
    initialise() {
        this.included = false;
        this.callOptions = CallOptions.create({
            withNew: true,
            args: this.arguments,
            callIdentifier: this
        });
    }
}
