import { NodeBase } from "./shared/Node";
import { BLANK } from "../../utils/object";

const {
    is
} = adone;

export default class ExportNamedDeclaration extends NodeBase {
    bindChildren() {
        // Do not bind specifiers
        if (this.declaration) { 
            this.declaration.bind(); 
        }
    }

    hasEffects(options) {
        return this.declaration && this.declaration.hasEffects(options);
    }

    render(code, options, { start, end } = BLANK) {
        if (is.null(this.declaration)) {
            code.remove(start, end);
        } else {
            code.remove(this.start, this.declaration.start);
            this.declaration.render(code, options, { start, end });
        }
    }
}
ExportNamedDeclaration.prototype.needsBoundaries = true;
ExportNamedDeclaration.prototype.isExportDeclaration = true;
