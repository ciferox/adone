import BlockScope from "../scopes/BlockScope";
import ExecutionPathOptions from "../ExecutionPathOptions";
import { StatementBase } from "./shared/Node";
import { NO_SEMICOLON } from "../../module";

export const isForOfStatement = (node) => node.type === "ForOfStatement";

export default class ForOfStatement extends StatementBase {
    bindNode() {
        this.left.reassignPath([], ExecutionPathOptions.create());
    }

    hasEffects(options) {
        return ((this.left &&
            (this.left.hasEffects(options) ||
                this.left.hasEffectsWhenAssignedAtPath([], options))) ||
            (this.right && this.right.hasEffects(options)) ||
            this.body.hasEffects(options.setIgnoreBreakStatements()));
    }

    includeInBundle() {
        let addedNewNodes = super.includeInBundle();
        if (this.left.includeWithAllDeclaredVariables()) {
            addedNewNodes = true;
        }
        return addedNewNodes;
    }

    initialiseChildren() {
        this.left.initialise(this.scope);
        this.right.initialise(this.scope.parent);
        this.body.initialiseAndReplaceScope
            ? this.body.initialiseAndReplaceScope(this.scope)
            : this.body.initialise(this.scope);
    }

    initialiseScope(parentScope) {
        this.scope = new BlockScope({ parent: parentScope });
    }

    render(code, options) {
        this.left.render(code, options, NO_SEMICOLON);
        this.right.render(code, options, NO_SEMICOLON);
        this.body.render(code, options);
    }
}
