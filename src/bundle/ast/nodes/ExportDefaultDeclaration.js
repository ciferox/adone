import { BLANK } from '../../utils/blank';
import { findFirstOccurrenceOutsideComment } from '../../utils/renderHelpers';
import { isClassDeclaration } from './ClassDeclaration';
import { isFunctionDeclaration } from './FunctionDeclaration';
import { isIdentifier } from './Identifier';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';
const WHITESPACE = /\s/;
// The header ends at the first non-white-space after "default"
function getDeclarationStart(code, start = 0) {
    start = findFirstOccurrenceOutsideComment(code, 'default', start) + 7;
    while (WHITESPACE.test(code[start]))
        start++;
    return start;
}
function getIdInsertPosition(code, declarationKeyword, start = 0) {
    const declarationEnd = findFirstOccurrenceOutsideComment(code, declarationKeyword, start) + declarationKeyword.length;
    code = code.slice(declarationEnd, findFirstOccurrenceOutsideComment(code, '{', declarationEnd));
    const generatorStarPos = findFirstOccurrenceOutsideComment(code, '*');
    if (generatorStarPos === -1) {
        return declarationEnd;
    }
    return declarationEnd + generatorStarPos + 1;
}
export function isExportDefaultDeclaration(node) {
    return node.type === NodeType.ExportDefaultDeclaration;
}
export default class ExportDefaultDeclaration extends NodeBase {
    bind() {
        super.bind();
        if (this.declarationName &&
            // Do not set it for Class and FunctionExpressions otherwise they get treeshaken away
            (isFunctionDeclaration(this.declaration) ||
                isClassDeclaration(this.declaration) ||
                isIdentifier(this.declaration))) {
            this.variable.setOriginalVariable(this.scope.findVariable(this.declarationName));
        }
    }
    initialise() {
        this.included = false;
        this.declarationName =
            (this.declaration.id &&
                this.declaration.id.name) ||
                this.declaration.name;
        this.variable = this.scope.addExportDefaultDeclaration(this.declarationName || this.context.getModuleName(), this);
        this.context.addExport(this);
    }
    render(code, options, { start, end } = BLANK) {
        const declarationStart = getDeclarationStart(code.original, this.start);
        if (isFunctionDeclaration(this.declaration)) {
            this.renderNamedDeclaration(code, declarationStart, 'function', this.declaration.id === null, options);
        }
        else if (isClassDeclaration(this.declaration)) {
            this.renderNamedDeclaration(code, declarationStart, 'class', this.declaration.id === null, options);
        }
        else if (this.variable.referencesOriginal()) {
            // Remove altogether to prevent re-declaring the same variable
            if (options.format === 'system' && this.variable.exportName) {
                code.overwrite(start, end, `exports('${this.variable.exportName}', ${this.variable.getName()});`);
            }
            else {
                code.remove(start, end);
            }
            return;
        }
        else if (this.variable.included) {
            this.renderVariableDeclaration(code, declarationStart, options);
        }
        else {
            code.remove(this.start, declarationStart);
            this.declaration.render(code, options, {
                renderedParentType: NodeType.ExpressionStatement,
                isCalleeOfRenderedParent: false
            });
            if (code.original[this.end - 1] !== ';') {
                code.appendLeft(this.end, ';');
            }
            return;
        }
        this.declaration.render(code, options);
    }
    renderNamedDeclaration(code, declarationStart, declarationKeyword, needsId, options) {
        const name = this.variable.getName();
        // Remove `export default`
        code.remove(this.start, declarationStart);
        if (needsId) {
            code.appendLeft(getIdInsertPosition(code.original, declarationKeyword, declarationStart), ` ${name}`);
        }
        if (options.format === 'system' &&
            isClassDeclaration(this.declaration) &&
            this.variable.exportName) {
            code.appendLeft(this.end, ` exports('${this.variable.exportName}', ${name});`);
        }
    }
    renderVariableDeclaration(code, declarationStart, options) {
        const systemBinding = options.format === 'system' && this.variable.exportName
            ? `exports('${this.variable.exportName}', `
            : '';
        code.overwrite(this.start, declarationStart, `${this.context.varOrConst} ${this.variable.getName()} = ${systemBinding}`);
        const hasTrailingSemicolon = code.original.charCodeAt(this.end - 1) === 59; /*";"*/
        if (systemBinding) {
            code.appendRight(hasTrailingSemicolon ? this.end - 1 : this.end, ')' + (hasTrailingSemicolon ? '' : ';'));
        }
        else if (!hasTrailingSemicolon) {
            code.appendLeft(this.end, ';');
        }
    }
}
ExportDefaultDeclaration.prototype.needsBoundaries = true;
