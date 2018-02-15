import { NodeBase } from "./shared/Node";
export default class VariableDeclarator extends NodeBase {
    reassignPath(path, options) {
        this.id.reassignPath(path, options);
    }

    initialiseDeclarator(parentScope, kind) {
        this.initialiseScope(parentScope);
        this.init && this.init.initialise(this.scope);
        this.id.initialiseAndDeclare(this.scope, kind, this.init);
    }
}
