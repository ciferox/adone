import { UNKNOWN_VALUE } from '../values';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';
export function isTemplateLiteral(node) {
    return node.type === NodeType.TemplateLiteral;
}
export default class TemplateLiteral extends NodeBase {
    getLiteralValueAtPath(path) {
        if (path.length > 0 || this.quasis.length !== 1) {
            return UNKNOWN_VALUE;
        }
        return this.quasis[0].value.cooked;
    }
    render(code, options) {
        code.indentExclusionRanges.push([this.start, this.end]);
        super.render(code, options);
    }
}
