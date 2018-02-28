import Variable from "./Variable";
import { blank, forOwn, keys } from "../../utils/object";
import { reservedWords } from "../../utils/identifierHelpers";

export const isNamespaceVariable = (variable) => variable.isNamespace;

export default class NamespaceVariable extends Variable {
    constructor(module) {
        super(module.basename());
        this.isNamespace = true;
        this.module = module;
        this.needsNamespaceBlock = false;
        this.originals = blank();
        module
            .getExports()
            .concat(module.getReexports())
            .forEach((name) => {
                this.originals[name] = module.traceExport(name);
            });
    }

    addReference(identifier) {
        this.name = identifier.name;
    }

    includeVariable() {
        if (!super.includeVariable()) {
            return false;
        }
        this.needsNamespaceBlock = true;
        forOwn(this.originals, (original) => original.includeVariable());
        return true;
    }

    renderBlock(legacy, freeze, indentString) {
        const members = keys(this.originals).map((name) => {
            const original = this.originals[name];
            if (original.isReassigned && !legacy) {
                return `${indentString}get ${name} () { return ${original.getName()}; }`;
            }
            if (legacy && reservedWords.includes(name)) {
                name = `'${name}'`;
            }
            return `${indentString}${name}: ${original.getName()}`;
        });
        const callee = freeze
            ? legacy ? "(Object.freeze || Object)" : "Object.freeze"
            : "";
        return `${this.module.graph.varOrConst} ${this.getName()} = ${callee}({\n${members.join(",\n")}\n});\n\n`;
    }
}