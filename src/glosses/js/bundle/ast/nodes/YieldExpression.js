import { NodeBase } from "./shared/Node";
export default class YieldExpression extends NodeBase {
    hasEffects(options) {
        return super.hasEffects(options) || !options.ignoreReturnAwaitYield();
    }
}
