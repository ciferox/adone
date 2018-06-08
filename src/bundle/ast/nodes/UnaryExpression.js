import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { EMPTY_PATH, UNKNOWN_VALUE } from '../values';
import { NodeBase } from './shared/Node';
const unaryOperators = {
    '-': value => -value,
    '+': value => +value,
    '!': value => !value,
    '~': value => ~value,
    typeof: value => typeof value,
    void: () => undefined,
    delete: () => UNKNOWN_VALUE
};
export default class UnaryExpression extends NodeBase {
    bind() {
        super.bind();
        if (this.operator === 'delete') {
            this.argument.reassignPath(EMPTY_PATH, NEW_EXECUTION_PATH);
        }
    }
    getLiteralValueAtPath(path, options) {
        if (path.length > 0)
            return UNKNOWN_VALUE;
        const argumentValue = this.argument.getLiteralValueAtPath(EMPTY_PATH, options);
        if (argumentValue === UNKNOWN_VALUE)
            return UNKNOWN_VALUE;
        return unaryOperators[this.operator](argumentValue);
    }
    hasEffects(options) {
        return (this.argument.hasEffects(options) ||
            (this.operator === 'delete' &&
                this.argument.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options)));
    }
    hasEffectsWhenAccessedAtPath(path, _options) {
        if (this.operator === 'void') {
            return path.length > 0;
        }
        return path.length > 1;
    }
}
