import { StatementBase } from "./shared/Node";
export default class BreakStatement extends StatementBase {
    hasEffects(options) {
        return (super.hasEffects(options) ||
            !options.ignoreBreakStatements() ||
            (this.label && !options.ignoreLabel(this.label.name)));
    }
}
