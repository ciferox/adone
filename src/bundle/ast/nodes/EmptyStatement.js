import * as NodeType from './NodeType';
import { StatementBase } from './shared/Node';
export default class EmptyStatement extends StatementBase {
    render(code, _options) {
        if (this.parent.type === NodeType.BlockStatement || this.parent.type === NodeType.Program) {
            code.remove(this.start, this.end);
        }
    }
}
