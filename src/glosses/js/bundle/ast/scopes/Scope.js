import { blank, keys } from "../../utils/object";
import LocalVariable from "../variables/LocalVariable";
import ExportDefaultVariable from "../variables/ExportDefaultVariable";
import { UNKNOWN_EXPRESSION } from "../values";
import ExecutionPathOptions from "../ExecutionPathOptions";
export default class Scope {
    constructor(options = {}) {
        this.parent = options.parent;
        this.isModuleScope = Boolean(options.isModuleScope);
        this.children = [];
        if (this.parent) {
            this.parent.children.push(this);
        }
        this.variables = blank();
    }

    /**
     * @param identifier
     * @param {Object} [options] - valid options are
     *        {(Node|null)} init
     *        {boolean} isHoisted
     * @return {Variable}
     */
    addDeclaration(identifier, options = {
        init: null,
        isHoisted: false
    }) {
        const name = identifier.name;
        if (this.variables[name]) {
            const variable = this.variables[name];
            variable.addDeclaration(identifier);
            variable.reassignPath([], ExecutionPathOptions.create());
        } else {
            this.variables[name] = new LocalVariable(identifier.name, identifier, options.init || UNKNOWN_EXPRESSION);
        }
        return this.variables[name];
    }

    addExportDefaultDeclaration(name, exportDefaultDeclaration) {
        this.variables.default = new ExportDefaultVariable(name, exportDefaultDeclaration);
        return this.variables.default;
    }

    addReturnExpression(expression) {
        this.parent && this.parent.addReturnExpression(expression);
    }

    contains(name) {
        return (Boolean(this.variables[name]) ||
            (this.parent ? this.parent.contains(name) : false));
    }

    deshadow(names, children = this.children) {
        keys(this.variables).forEach((key) => {
            const declaration = this.variables[key];
            // we can disregard exports.foo etc
            if (declaration.exportName && declaration.isReassigned && !declaration.isId) {
                return;
            }
            let name = declaration.getName(true);
            if (!names.has(name)) {
                return;
            }
            name = declaration.name;
            let deshadowed;
            let i = 1;
            do {
                deshadowed = `${name}$$${i++}`;
            } while (names.has(deshadowed));
            declaration.setSafeName(deshadowed);
        });
        children.forEach((scope) => scope.deshadow(names));
    }

    findLexicalBoundary() {
        return this.parent.findLexicalBoundary();
    }

    findVariable(name) {
        return this.variables[name] || (this.parent && this.parent.findVariable(name));
    }
}
