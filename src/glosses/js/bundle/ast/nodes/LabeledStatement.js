import { StatementBase } from "./shared/Node";
export default class LabeledStatement extends StatementBase {
    hasEffects(options) {
        return this.body.hasEffects(options.setIgnoreLabel(this.label.name).setIgnoreBreakStatements());
    }
}
