import BlockScope from "../scopes/BlockScope";
import { StatementBase } from "./shared/Node";
export default class SwitchStatement extends StatementBase {
    hasEffects(options) {
        return super.hasEffects(options.setIgnoreBreakStatements());
    }

    initialiseScope(parentScope) {
        this.scope = new BlockScope({ parent: parentScope });
    }
}
