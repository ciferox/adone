import { NodeBase } from "./shared/Node";
import { BLANK } from "../../utils/object";
export default class ExportAllDeclaration extends NodeBase {
    render(code, _options, { start, end } = BLANK) {
        code.remove(start, end);
    }
}
ExportAllDeclaration.prototype.needsBoundaries = true;
ExportAllDeclaration.prototype.isExportDeclaration = true;
