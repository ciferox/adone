import { NodeBase } from "./shared/Node";
import { BLANK } from "../../utils/object";

export default class ImportDeclaration extends NodeBase {
    bindChildren() { }

    render(code, _options, { start, end } = BLANK) {
        code.remove(start, end);
    }
}
ImportDeclaration.prototype.isImportDeclaration = true;
ImportDeclaration.prototype.needsBoundaries = true;
