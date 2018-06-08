import { NO_SEMICOLON } from '../../utils/renderHelpers';
import BlockScope from '../scopes/BlockScope';
import * as NodeType from './NodeType';
import { StatementBase } from './shared/Node';
export function isForStatement(node) {
    return node.type === NodeType.ForStatement;
}
export default class ForStatement extends StatementBase {
    createScope(parentScope) {
        this.scope = new BlockScope({ parent: parentScope });
    }
    hasEffects(options) {
        return ((this.init && this.init.hasEffects(options)) ||
            (this.test && this.test.hasEffects(options)) ||
            (this.update && this.update.hasEffects(options)) ||
            this.body.hasEffects(options.setIgnoreBreakStatements()));
    }
    render(code, options) {
        if (this.init)
            this.init.render(code, options, NO_SEMICOLON);
        if (this.test)
            this.test.render(code, options, NO_SEMICOLON);
        if (this.update)
            this.update.render(code, options, NO_SEMICOLON);
        this.body.render(code, options);
    }
}
