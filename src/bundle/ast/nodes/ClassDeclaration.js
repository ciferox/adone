import * as NodeType from './NodeType';
import ClassNode from './shared/ClassNode';
export function isClassDeclaration(node) {
    return node.type === NodeType.ClassDeclaration;
}
export default class ClassDeclaration extends ClassNode {
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
    render(code, options) {
        if (options.format === 'system' && this.id && this.id.variable.exportName) {
            code.appendLeft(this.end, ` exports('${this.id.variable.exportName}', ${this.id.variable.getName()});`);
        }
        super.render(code, options);
    }
}
