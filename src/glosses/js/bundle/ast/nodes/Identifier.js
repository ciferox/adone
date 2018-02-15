import { NodeBase } from "./shared/Node";
import isReference from "is-reference";
import { UNKNOWN_EXPRESSION } from "../values";

export const isIdentifier = (node) => node.type === "Identifier";

export default class Identifier extends NodeBase {
    bindNode() {
        if (isReference(this, this.parent)) {
            this.variable = this.scope.findVariable(this.name);
            this.variable.addReference(this);
        }
    }

    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        if (!this.isBound) {
            this.bind();
        }
        this.variable &&
            this.variable.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
    }

    hasEffectsWhenAccessedAtPath(path, options) {
        return (this.variable && this.variable.hasEffectsWhenAccessedAtPath(path, options));
    }

    hasEffectsWhenAssignedAtPath(path, options) {
        return (!this.variable ||
            this.variable.hasEffectsWhenAssignedAtPath(path, options));
    }

    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        return (!this.variable ||
            this.variable.hasEffectsWhenCalledAtPath(path, callOptions, options));
    }

    includeInBundle() {
        if (this.included) {
            return false;
        }
        this.included = true;
        this.variable && this.variable.includeVariable();
        return true;
    }

    initialiseAndDeclare(parentScope, kind, init) {
        this.initialiseScope(parentScope);
        switch (kind) {
            case "var":
            case "function":
                this.variable = this.scope.addDeclaration(this, {
                    isHoisted: true,
                    init
                });
                break;
            case "let":
            case "const":
            case "class":
                this.variable = this.scope.addDeclaration(this, { init });
                break;
            case "parameter":
                this.variable = this.scope.addParameterDeclaration(this);
                break;
            default:
                throw new Error(`Unexpected identifier kind ${kind}.`);
        }
    }

    reassignPath(path, options) {
        if (!this.isBound) {
            this.bind();
        }
        if (this.variable) {
            if (path.length === 0) {
                this.disallowImportReassignment();
            }
            this.variable.reassignPath(path, options);
        }
    }

    disallowImportReassignment() {
        if (this.module.imports[this.name] && !this.scope.contains(this.name)) {
            this.module.error({
                code: "ILLEGAL_REASSIGNMENT",
                message: `Illegal reassignment to import '${this.name}'`
            }, this.start);
        }
    }

    renderSystemBindingUpdate(code, name) {
        switch (this.parent.type) {
            case "AssignmentExpression" /* AssignmentExpression */:
                {
                    const expression = this.parent;
                    if (expression.left === this) {
                        code.prependLeft(expression.right.start, `exports('${this.variable.exportName}', `);
                        code.prependRight(expression.right.end, ")");
                    }
                }
                break;
            case "UpdateExpression" /* UpdateExpression */:
                {
                    const expression = this.parent;
                    if (expression.prefix) {
                        code.overwrite(expression.start, expression.end, `exports('${this.variable.exportName}', ${expression.operator}${name})`);
                    } else {
                        let op;
                        switch (expression.operator) {
                            case "++":
                                op = `${name} + 1`;
                                break;
                            case "--":
                                op = `${name} - 1`;
                                break;
                            case "**":
                                op = `${name} * ${name}`;
                                break;
                        }
                        code.overwrite(expression.start, expression.end, `(exports(${this.variable.exportName}, ${op}), ${name}${expression.operator})`);
                    }
                }
                break;
        }
    }

    render(code, options) {
        if (this.variable) {
            const name = this.variable.getName();
            if (name !== this.name) {
                code.overwrite(this.start, this.end, name, {
                    storeName: true,
                    contentOnly: false
                });
                // special case
                if (this.parent.type === "Property" /* Property */ && this.parent.shorthand) {
                    code.appendLeft(this.start, `${this.name}: `);
                }
            }
            if (options.systemBindings && this.variable.exportName) {
                this.renderSystemBindingUpdate(code, name);
            }
        }
    }

    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (this.variable) {
            return this.variable.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options);
        }
        return predicateFunction(options)(UNKNOWN_EXPRESSION);
    }
}
