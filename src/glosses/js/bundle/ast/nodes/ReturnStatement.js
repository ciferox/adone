import { UNKNOWN_EXPRESSION } from "../values";
import { StatementBase } from "./shared/Node";
export default class ReturnStatement extends StatementBase {
    hasEffects(options) {
        return super.hasEffects(options) || !options.ignoreReturnAwaitYield();
    }

    initialiseNode() {
        this.scope.addReturnExpression(this.argument || UNKNOWN_EXPRESSION);
    }
}
