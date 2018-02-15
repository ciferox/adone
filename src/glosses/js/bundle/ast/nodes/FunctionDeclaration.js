import FunctionNode from "./shared/FunctionNode";
import Scope from "../scopes/Scope";

const {
    is
} = adone;

export const isFunctionDeclaration = (node) => node.type === "FunctionDeclaration";

export default class FunctionDeclaration extends FunctionNode {
    initialiseChildren(parentScope) {
        if (!is.null(this.id)) {
            this.id.initialiseAndDeclare(parentScope, "function", this);
            this.id.variable.isId = true;
        }
        this.params.forEach((param) => param.initialiseAndDeclare(this.scope, "parameter", null));
        this.body.initialiseAndReplaceScope(new Scope({ parent: this.scope }));
    }
}
