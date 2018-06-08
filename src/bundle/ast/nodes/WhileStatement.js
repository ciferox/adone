import { StatementBase } from './shared/Node';
export default class WhileStatement extends StatementBase {
    hasEffects(options) {
        return (this.test.hasEffects(options) || this.body.hasEffects(options.setIgnoreBreakStatements()));
    }
}
