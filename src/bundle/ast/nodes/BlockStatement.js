import { renderStatementList } from '../../utils/renderHelpers';
import BlockScope from '../scopes/BlockScope';
import { UNKNOWN_EXPRESSION } from '../values';
import * as NodeType from './NodeType';
import { StatementBase } from './shared/Node';
export function isBlockStatement(node) {
    return node.type === NodeType.BlockStatement;
}
export default class BlockStatement extends StatementBase {
    addImplicitReturnExpressionToScope() {
        const lastStatement = this.body[this.body.length - 1];
        if (!lastStatement || lastStatement.type !== NodeType.ReturnStatement) {
            this.scope.addReturnExpression(UNKNOWN_EXPRESSION);
        }
    }
    createScope(parentScope) {
        this.scope = this.parent.preventChildBlockScope
            ? parentScope
            : new BlockScope({ parent: parentScope });
    }
    hasEffects(options) {
        for (const node of this.body) {
            if (node.hasEffects(options))
                return true;
        }
    }
    include() {
        this.included = true;
        for (const node of this.body) {
            if (node.shouldBeIncluded())
                node.include();
        }
    }
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start + 1, this.end - 1, options);
        }
        else {
            super.render(code, options);
        }
    }
}
