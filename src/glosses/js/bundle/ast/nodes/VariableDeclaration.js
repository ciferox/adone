import { NodeBase } from "./shared/Node";
import ExecutionPathOptions from "../ExecutionPathOptions";
import { getCommaSeparatedNodesWithBoundaries } from "../../utils/renderHelpers";
import { isIdentifier } from "./Identifier";
import { BLANK } from "../../utils/object";

const {
    is
} = adone;

const isReassignedExportsMember = (variable) => variable.safeName && variable.safeName.indexOf(".") !== -1 && variable.exportName && variable.isReassigned;

export const isVariableDeclaration = (node) => node.type === "VariableDeclaration";

export default class VariableDeclaration extends NodeBase {
    reassignPath(_path, _options) {
        this.declarations.forEach((declarator) => declarator.reassignPath([], ExecutionPathOptions.create()));
    }

    hasEffectsWhenAssignedAtPath(_path, _options) {
        return false;
    }

    includeWithAllDeclaredVariables() {
        let addedNewNodes = !this.included;
        this.included = true;
        this.declarations.forEach((declarator) => {
            if (declarator.includeInBundle()) {
                addedNewNodes = true;
            }
        });
        return addedNewNodes;
    }

    includeInBundle() {
        let addedNewNodes = !this.included;
        this.included = true;
        this.declarations.forEach((declarator) => {
            if (declarator.shouldBeIncluded()) {
                if (declarator.includeInBundle()) {
                    addedNewNodes = true;
                }
            }
        });
        return addedNewNodes;
    }

    initialiseChildren() {
        this.declarations.forEach((child) => child.initialiseDeclarator(this.scope, this.kind));
    }

    render(code, options, nodeRenderOptions = BLANK) {
        if (this.declarations.every((declarator) => declarator.included && (!declarator.id.variable || !declarator.id.variable.exportName))) {
            for (const declarator of this.declarations) {
                declarator.render(code, options);
                if (!nodeRenderOptions.isNoStatement && code.original.charCodeAt(this.end - 1) !== 59 /*";"*/) {
                    code.appendLeft(this.end, ";");
                }
            }
        } else {
            this.renderReplacedDeclarations(code, options, nodeRenderOptions);
        }
    }

    renderReplacedDeclarations(code, options, { start = this.start, end = this.end, isNoStatement }) {
        const separatedNodes = getCommaSeparatedNodesWithBoundaries(this.declarations, code, this.start + this.kind.length, this.end - (code.original.charCodeAt(this.end - 1) === 59 /*";"*/ ? 1 : 0));
        let actualContentEnd, renderedContentEnd;
        if (/\n\s*$/.test(code.slice(this.start, separatedNodes[0].start))) {
            renderedContentEnd = this.start + this.kind.length;
        } else {
            renderedContentEnd = separatedNodes[0].start;
        }
        let lastSeparatorPos = renderedContentEnd - 1;
        code.remove(this.start, lastSeparatorPos);
        let isInDeclaration = false;
        let hasRenderedContent = false;
        let separatorString = "", leadingString, nextSeparatorString;
        for (const { node, start, separator, contentEnd, end } of separatedNodes) {
            if (!node.included || (isIdentifier(node.id) && isReassignedExportsMember(node.id.variable) && is.null(node.init))) {
                code.remove(start, end);
                continue;
            }
            leadingString = "";
            nextSeparatorString = "";
            if (isIdentifier(node.id) && isReassignedExportsMember(node.id.variable)) {
                if (hasRenderedContent) {
                    separatorString += ";";
                }
                isInDeclaration = false;
            } else {
                if (options.systemBindings && !is.null(node.init) && isIdentifier(node.id) && node.id.variable.exportName) {
                    code.prependLeft(node.init.start, `exports('${node.id.variable.exportName}', `);
                    nextSeparatorString += ")";
                }
                if (isInDeclaration) {
                    separatorString += ",";
                } else {
                    if (hasRenderedContent) {
                        separatorString += ";";
                    }
                    leadingString += `${this.kind} `;
                    isInDeclaration = true;
                }
            }
            if (renderedContentEnd === lastSeparatorPos + 1) {
                code.overwrite(lastSeparatorPos, renderedContentEnd, separatorString + leadingString);
            } else {
                code.overwrite(lastSeparatorPos, lastSeparatorPos + 1, separatorString);
                code.appendLeft(renderedContentEnd, leadingString);
            }
            node.render(code, options);
            actualContentEnd = contentEnd;
            renderedContentEnd = end;
            hasRenderedContent = true;
            lastSeparatorPos = separator;
            separatorString = nextSeparatorString;
        }
        if (hasRenderedContent) {
            this.renderDeclarationEnd(code, separatorString, lastSeparatorPos, actualContentEnd, renderedContentEnd, !isNoStatement);
        } else {
            code.remove(start, end);
        }
    }

    renderDeclarationEnd(code, separatorString, lastSeparatorPos, actualContentEnd, renderedContentEnd, addSemicolon) {
        if (code.original.charCodeAt(this.end - 1) === 59 /*";"*/) {
            code.remove(this.end - 1, this.end);
        }
        if (addSemicolon) {
            separatorString += ";";
        }
        if (!is.null(lastSeparatorPos)) {
            if (code.original.charCodeAt(actualContentEnd - 1) === 10 /*"\n"*/
                && (code.original.charCodeAt(this.end) === 10 /*"\n"*/ || code.original.charCodeAt(this.end) === 13 /*"\r"*/)) {
                actualContentEnd--;
                if (code.original.charCodeAt(actualContentEnd) === 13 /*"\r"*/) {
                    actualContentEnd--;
                }
            }
            if (actualContentEnd === lastSeparatorPos + 1) {
                code.overwrite(lastSeparatorPos, renderedContentEnd, separatorString);
            } else {
                code.overwrite(lastSeparatorPos, lastSeparatorPos + 1, separatorString);
                code.remove(actualContentEnd, renderedContentEnd);
            }
        } else {
            code.appendLeft(renderedContentEnd, separatorString);
        }
        return separatorString;
    }
}
