import BlockScope from "../scopes/BlockScope";
import { UNKNOWN_EXPRESSION } from "../values";
import { StatementBase } from "./shared/Node";
import { renderStatementList } from "../../utils/renderHelpers";

export function isBlockStatement(node) {
    return node.type === "BlockStatement";
}
export default class BlockStatement extends StatementBase {
    bindImplicitReturnExpressionToScope() {
        const lastStatement = this.body[this.body.length - 1];
        if (!lastStatement || lastStatement.type !== "ReturnStatement" /* ReturnStatement */) {
            this.scope.addReturnExpression(UNKNOWN_EXPRESSION);
        }
    }

    hasEffects(options) {
        return this.body.some((child) => child.hasEffects(options));
    }

    includeInBundle() {
        let addedNewNodes = !this.included;
        this.included = true;
        this.body.forEach((node) => {
            if (node.shouldBeIncluded()) {
                if (node.includeInBundle()) {
                    addedNewNodes = true;
                }
            }
        });
        return addedNewNodes;
    }

    initialiseAndReplaceScope(scope) {
        this.scope = scope;
        this.initialiseNode(scope);
        this.initialiseChildren(scope);
    }

    initialiseChildren(_parentScope) {
        for (const node of this.body) {
            node.initialise(this.scope);
        }
    }

    initialiseScope(parentScope) {
        this.scope = new BlockScope({ parent: parentScope });
    }

    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start + 1, this.end - 1, options);
        } else {
            super.render(code, options);
        }
    }
}
