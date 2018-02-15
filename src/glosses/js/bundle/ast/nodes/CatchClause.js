import { NodeBase } from "./shared/Node";
import CatchScope from "../scopes/CatchScope";
export default class CatchClause extends NodeBase {
    initialiseChildren() {
        this.param && this.param.initialiseAndDeclare(this.scope, "parameter", null);
        this.body.initialiseAndReplaceScope(this.scope);
    }

    initialiseScope(parentScope) {
        this.scope = new CatchScope({ parent: parentScope });
    }
}
