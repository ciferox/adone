import { toBase64 } from '../../utils/base64';
import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { EMPTY_PATH, UNKNOWN_EXPRESSION } from '../values';
import ExportDefaultVariable from '../variables/ExportDefaultVariable';
import LocalVariable from '../variables/LocalVariable';
export default class Scope {
    constructor(options = {}) {
        this.parent = options.parent;
        this.isModuleScope = !!options.isModuleScope;
        this.children = [];
        if (this.parent)
            this.parent.children.push(this);
        this.variables = Object.create(null);
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
            variable.reassignPath(EMPTY_PATH, NEW_EXECUTION_PATH);
        }
        else {
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
        return name in this.variables || (this.parent ? this.parent.contains(name) : false);
    }
    deshadow(names, children = this.children) {
        for (const key of Object.keys(this.variables)) {
            const declaration = this.variables[key];
            // we can disregard exports.foo etc
            if (declaration.exportName && declaration.isReassigned && !declaration.isId)
                continue;
            if (declaration.isDefault)
                continue;
            let name = declaration.getName(true);
            if (!names.has(name))
                continue;
            name = declaration.name;
            let deshadowed, i = 1;
            do {
                deshadowed = `${name}$$${toBase64(i++)}`;
            } while (names.has(deshadowed));
            declaration.setSafeName(deshadowed);
        }
        for (const scope of children)
            scope.deshadow(names);
    }
    findLexicalBoundary() {
        return this.parent.findLexicalBoundary();
    }
    findVariable(name) {
        return this.variables[name] || (this.parent && this.parent.findVariable(name));
    }
}
