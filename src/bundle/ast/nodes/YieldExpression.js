import { NodeBase } from './shared/Node';
export default class YieldExpression extends NodeBase {
    hasEffects(options) {
        return (!options.ignoreReturnAwaitYield() || (this.argument && this.argument.hasEffects(options)));
    }
    render(code, options) {
        if (this.argument) {
            this.argument.render(code, options);
            if (this.argument.start === this.start + 5 /* 'yield'.length */) {
                code.prependLeft(this.start + 5, ' ');
            }
        }
    }
}
