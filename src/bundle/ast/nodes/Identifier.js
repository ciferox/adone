import isReference from 'is-reference';
import { BLANK } from '../../utils/blank';
import { UNKNOWN_EXPRESSION, UNKNOWN_VALUE } from '../values';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';
export function isIdentifier(node) {
    return node.type === NodeType.Identifier;
}
export default class Identifier extends NodeBase {
    bind() {
        if (this.bound)
            return;
        this.bound = true;
        if (this.variable === null && isReference(this, this.parent)) {
            this.variable = this.scope.findVariable(this.name);
            this.variable.addReference(this);
        }
    }
    declare(kind, init) {
        switch (kind) {
            case 'var':
            case 'function':
                this.variable = this.scope.addDeclaration(this, {
                    isHoisted: true,
                    init
                });
                break;
            case 'let':
            case 'const':
            case 'class':
                this.variable = this.scope.addDeclaration(this, { init });
                break;
            case 'parameter':
                this.variable = this.scope.addParameterDeclaration(this);
                break;
            default:
                throw new Error(`Unexpected identifier kind ${kind}.`);
        }
    }
    forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options) {
        if (!this.bound)
            this.bind();
        if (this.variable !== null) {
            this.variable.forEachReturnExpressionWhenCalledAtPath(path, callOptions, callback, options);
        }
    }
    getLiteralValueAtPath(path, options) {
        if (this.variable !== null) {
            return this.variable.getLiteralValueAtPath(path, options);
        }
        return UNKNOWN_VALUE;
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        return this.variable && this.variable.hasEffectsWhenAccessedAtPath(path, options);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        return !this.variable || this.variable.hasEffectsWhenAssignedAtPath(path, options);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        return !this.variable || this.variable.hasEffectsWhenCalledAtPath(path, callOptions, options);
    }
    include() {
        if (!this.included) {
            this.included = true;
            if (this.variable !== null && !this.variable.included) {
                this.variable.include();
                this.context.requestTreeshakingPass();
            }
        }
    }
    initialise() {
        this.included = false;
        this.bound = false;
        // To avoid later shape mutations
        if (!this.variable) {
            this.variable = null;
        }
    }
    reassignPath(path, options) {
        if (!this.bound)
            this.bind();
        if (this.variable !== null) {
            if (path.length === 0 &&
                this.name in this.context.imports &&
                !this.scope.contains(this.name)) {
                this.disallowImportReassignment();
            }
            this.variable.reassignPath(path, options);
        }
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent } = BLANK) {
        if (this.variable) {
            const name = this.variable.getName();
            if (name !== this.name) {
                code.overwrite(this.start, this.end, name, {
                    storeName: true,
                    contentOnly: true
                });
                if (this.parent.type === NodeType.Property && this.parent.shorthand) {
                    code.prependRight(this.start, `${this.name}: `);
                }
            }
            // In strict mode, any variable named "eval" must be the actual "eval" function
            if (name === 'eval' &&
                renderedParentType === NodeType.CallExpression &&
                isCalleeOfRenderedParent) {
                code.appendRight(this.start, '0, ');
            }
            if (options.format === 'system' && this.variable.exportName) {
                this.renderSystemBindingUpdate(code, name);
            }
        }
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (this.variable) {
            return this.variable.someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options);
        }
        return predicateFunction(options, UNKNOWN_EXPRESSION);
    }
    disallowImportReassignment() {
        this.context.error({
            code: 'ILLEGAL_REASSIGNMENT',
            message: `Illegal reassignment to import '${this.name}'`
        }, this.start);
    }
    renderSystemBindingUpdate(code, name) {
        switch (this.parent.type) {
            case NodeType.AssignmentExpression:
                {
                    const expression = this.parent;
                    if (expression.left === this) {
                        code.prependLeft(expression.right.start, `exports('${this.variable.exportName}', `);
                        code.prependRight(expression.right.end, `)`);
                    }
                }
                break;
            case NodeType.UpdateExpression:
                {
                    const expression = this.parent;
                    if (expression.prefix) {
                        code.overwrite(expression.start, expression.end, `exports('${this.variable.exportName}', ${expression.operator}${name})`);
                    }
                    else {
                        let op;
                        switch (expression.operator) {
                            case '++':
                                op = `${name} + 1`;
                                break;
                            case '--':
                                op = `${name} - 1`;
                                break;
                            case '**':
                                op = `${name} * ${name}`;
                                break;
                        }
                        code.overwrite(expression.start, expression.end, `(exports('${this.variable.exportName}', ${op}), ${name}${expression.operator})`);
                    }
                }
                break;
        }
    }
}
