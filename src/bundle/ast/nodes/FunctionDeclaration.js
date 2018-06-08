import * as NodeType from './NodeType';
import FunctionNode from './shared/FunctionNode';
export function isFunctionDeclaration(node) {
    return node.type === NodeType.FunctionDeclaration;
}
export default class FunctionDeclaration extends FunctionNode {
    initialise() {
        super.initialise();
        if (this.id !== null) {
            this.id.variable.isId = true;
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.id !== null) {
            this.id = new this.context.nodeConstructors.Identifier(esTreeNode.id, this, this.scope.parent);
        }
        super.parseNode(esTreeNode);
    }
}
