import { NO_SEMICOLON } from '../../utils/renderHelpers';
import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import BlockScope from '../scopes/BlockScope';
import { EMPTY_PATH } from '../values';
import * as NodeType from './NodeType';
import { StatementBase } from './shared/Node';
export function isForInStatement(node) {
    return node.type === NodeType.ForInStatement;
}
export default class ForInStatement extends StatementBase {
    bind() {
        super.bind();
        if (this.left.type !== NodeType.VariableDeclaration) {
            this.left.reassignPath(EMPTY_PATH, NEW_EXECUTION_PATH);
        }
    }
    createScope(parentScope) {
        this.scope = new BlockScope({ parent: parentScope });
    }
    hasEffects(options) {
        return ((this.left &&
            (this.left.hasEffects(options) ||
                this.left.hasEffectsWhenAssignedAtPath(EMPTY_PATH, options))) ||
            (this.right && this.right.hasEffects(options)) ||
            this.body.hasEffects(options.setIgnoreBreakStatements()));
    }
    include() {
        this.included = true;
        this.left.includeWithAllDeclaredVariables();
        this.right.include();
        this.body.include();
    }
    render(code, options) {
        this.left.render(code, options, NO_SEMICOLON);
        this.right.render(code, options, NO_SEMICOLON);
        this.body.render(code, options);
    }
}
