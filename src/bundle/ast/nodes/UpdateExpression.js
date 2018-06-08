import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { EMPTY_PATH } from '../values';
import { isIdentifier } from './Identifier';
import { NodeBase } from './shared/Node';
export default class UpdateExpression extends NodeBase {
    bind() {
        super.bind();
        this.argument.reassignPath(EMPTY_PATH, NEW_EXECUTION_PATH);
        if (isIdentifier(this.argument)) {
            const variable = this.scope.findVariable(this.argument.name);
            variable.isReassigned = true;
        }
    }
    hasEffects(options) {
        return (this.argument.hasEffects(options) ||
            this.argument.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options));
    }
    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }
}
