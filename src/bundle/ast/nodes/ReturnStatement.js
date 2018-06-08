import { UNKNOWN_EXPRESSION } from '../values';
import { StatementBase } from './shared/Node';
export default class ReturnStatement extends StatementBase {
    hasEffects(options) {
        return (!options.ignoreReturnAwaitYield() || (this.argument && this.argument.hasEffects(options)));
    }
    initialise() {
        this.included = false;
        this.scope.addReturnExpression(this.argument || UNKNOWN_EXPRESSION);
    }
    render(code, options) {
        if (this.argument) {
            this.argument.render(code, options);
            if (this.argument.start === this.start + 6 /* 'return'.length */) {
                code.prependLeft(this.start + 6, ' ');
            }
        }
    }
}
