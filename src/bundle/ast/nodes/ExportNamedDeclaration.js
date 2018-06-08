import { BLANK } from '../../utils/blank';
import { NodeBase } from './shared/Node';
export default class ExportNamedDeclaration extends NodeBase {
    bind() {
        // Do not bind specifiers
        if (this.declaration !== null)
            this.declaration.bind();
    }
    hasEffects(options) {
        return this.declaration && this.declaration.hasEffects(options);
    }
    initialise() {
        this.included = false;
        this.context.addExport(this);
    }
    render(code, options, { start, end } = BLANK) {
        if (this.declaration === null) {
            code.remove(start, end);
        }
        else {
            code.remove(this.start, this.declaration.start);
            this.declaration.render(code, options, { start, end });
        }
    }
}
ExportNamedDeclaration.prototype.needsBoundaries = true;
