import { BLANK } from '../../utils/blank';
import { NodeBase } from './shared/Node';
export default class ImportDeclaration extends NodeBase {
    bind() { }
    initialise() {
        this.included = false;
        this.context.addImport(this);
    }
    hasEffects() {
        return false;
    }
    render(code, _options, { start, end } = BLANK) {
        code.remove(start, end);
    }
}
ImportDeclaration.prototype.needsBoundaries = true;
