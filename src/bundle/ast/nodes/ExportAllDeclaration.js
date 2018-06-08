import { BLANK } from '../../utils/blank';
import { NodeBase } from './shared/Node';
export default class ExportAllDeclaration extends NodeBase {
    initialise() {
        this.included = false;
        this.context.addExport(this);
    }
    render(code, _options, { start, end } = BLANK) {
        code.remove(start, end);
    }
}
ExportAllDeclaration.prototype.needsBoundaries = true;
