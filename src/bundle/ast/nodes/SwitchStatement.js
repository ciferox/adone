import BlockScope from '../scopes/BlockScope';
import { StatementBase } from './shared/Node';
export default class SwitchStatement extends StatementBase {
    createScope(parentScope) {
        this.scope = new BlockScope({ parent: parentScope });
    }
    hasEffects(options) {
        return super.hasEffects(options.setIgnoreBreakStatements());
    }
}
