import { NodeBase } from "./shared/Node";
export function isTemplateLiteral(node) {
    return node.type === "TemplateLiteral";
}
export default class TemplateLiteral extends NodeBase {
    render(code, options) {
        code.indentExclusionRanges.push([this.start, this.end]); // TODO TypeScript: Awaiting PR
        super.render(code, options);
    }
}
