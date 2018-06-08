import { NodeBase } from './shared/Node';
export default class AwaitExpression extends NodeBase {
    hasEffects(options) {
        return super.hasEffects(options) || !options.ignoreReturnAwaitYield();
    }
}
