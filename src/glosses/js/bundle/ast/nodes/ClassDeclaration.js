import ClassNode from "./shared/ClassNode";

export const isClassDeclaration = (node) => node.type === "ClassDeclaration";

export default class ClassDeclaration extends ClassNode {
    initialiseChildren(parentScope) {
        // Class declarations are like let declarations: Not hoisted, can be reassigned, cannot be redeclared
        if (this.id) {
            this.id.initialiseAndDeclare(parentScope, "class", this);
            this.id.variable.isId = true;
        }
        super.initialiseChildren(parentScope);
    }

    render(code, options) {
        if (options.systemBindings && this.id.variable.exportName) {
            code.appendRight(this.end, ` exports('${this.id.variable.exportName}', ${this.id.variable.getName()});`);
        }
        super.render(code, options);
    }
}
