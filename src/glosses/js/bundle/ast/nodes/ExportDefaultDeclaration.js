import { NodeBase } from "./shared/Node";
import { isClassDeclaration } from "./ClassDeclaration";
import { isFunctionDeclaration } from "./FunctionDeclaration";
import { findFirstOccurrenceOutsideComment } from "../../utils/renderHelpers";
import { isObjectExpression } from "./ObjectExpression";
import { BLANK } from "../../utils/object";
const WHITESPACE = /\s/;

const {
    is
} = adone;

// The header ends at the first non-white-space after "default"
const getDeclarationStart = function (code, start = 0) {
    start = findFirstOccurrenceOutsideComment(code, "default", start) + 7;
    while (WHITESPACE.test(code[start])) {
        start++; 
    }
    return start;
};

const getIdInsertPosition = function (code, declarationKeyword, start = 0) {
    const declarationEnd = findFirstOccurrenceOutsideComment(code, declarationKeyword, start) + declarationKeyword.length;
    code = code.slice(declarationEnd, findFirstOccurrenceOutsideComment(code, "{", declarationEnd));
    const generatorStarPos = findFirstOccurrenceOutsideComment(code, "*");
    if (generatorStarPos === -1) {
        return declarationEnd;
    }
    return declarationEnd + generatorStarPos + 1;
};

const needsToBeWrapped = isObjectExpression;
export default class ExportDefaultDeclaration extends NodeBase {
    bindNode() {
        if (this.declarationName) {
            this.variable.setOriginalVariable(this.scope.findVariable(this.declarationName));
        }
    }

    initialiseNode() {
        this.declarationName =
            (this.declaration.id && this.declaration.id.name) ||
            this.declaration.name;
        this.variable = this.scope.addExportDefaultDeclaration(this.declarationName || this.module.basename(), this);
    }

    render(code, options, { start, end } = BLANK) {
        const declarationStart = getDeclarationStart(code.original, this.start);
        if (isFunctionDeclaration(this.declaration)) {
            this.renderNamedDeclaration(code, declarationStart, "function", is.null(this.declaration.id), options);
        } else if (isClassDeclaration(this.declaration)) {
            this.renderNamedDeclaration(code, declarationStart, "class", is.null(this.declaration.id), options);
        } else if (this.variable.getOriginalVariableName() === this.variable.getName()) {
            // Remove altogether to prevent re-declaring the same variable
            code.remove(start, end);
            return;
        } else if (this.variable.included) {
            this.renderVariableDeclaration(code, declarationStart, options);
        } else {
            this.renderForSideEffectsOnly(code, declarationStart);
        }
        super.render(code, options);
    }

    renderNamedDeclaration(code, declarationStart, declarationKeyword, needsId, options) {
        const name = this.variable.getName();
        // Remove `export default`
        code.remove(this.start, declarationStart);
        if (needsId) {
            code.appendLeft(getIdInsertPosition(code.original, declarationKeyword, declarationStart), ` ${name}`);
        }
        if (options.systemBindings && isClassDeclaration(this.declaration)) {
            code.appendRight(this.end, ` exports('default', ${name});`);
        }
    }

    renderVariableDeclaration(code, declarationStart, options) {
        const systemBinding = options.systemBindings ? `exports('${this.variable.exportName}', ` : "";
        code.overwrite(this.start, declarationStart, `${this.module.graph.varOrConst} ${this.variable.getName()} = ${systemBinding}`);
        if (systemBinding) {
            code.prependRight(this.end - 1, ")");
        }
    }

    renderForSideEffectsOnly(code, declarationStart) {
        code.remove(this.start, declarationStart);
        if (needsToBeWrapped(this.declaration)) {
            code.appendLeft(declarationStart, "(");
            if (code.original[this.end - 1] === ";") {
                code.prependRight(this.end - 1, ")");
            } else {
                code.prependRight(this.end, ");");
            }
        }
    }
}
ExportDefaultDeclaration.prototype.needsBoundaries = true;
ExportDefaultDeclaration.prototype.isExportDeclaration = true;
