const { is } = adone;

const traverseAndCheck = (obj, type, results) => {
    if (obj instanceof type) {
        results.push(obj);
    }

    if (obj instanceof Node) {  // eslint-disable-line no-use-before-define
        obj.findAll(type, results);
    }
};

export class Node {
    constructor(lineno, colno, ...fieldsValues) {
        this.lineno = lineno;
        this.colno = colno;

        const { fields } = this;
        for (let i = 0; i < fields.length; ++i) {
            const field = fields[i];

            let val = fieldsValues[i];

            if (is.undefined(val)) {
                val = null;
            }

            this[field] = val;
        }
    }

    findAll(type, results = []) {
        if (this instanceof NodeList) {  // eslint-disable-line no-use-before-define
            const { children } = this;

            for (let i = 0; i < children.length; i++) {
                traverseAndCheck(children[i], type, results);
            }
        } else {
            const { fields } = this;

            for (let i = 0; i < fields.length; i++) {
                traverseAndCheck(this[fields[i]], type, results);
            }
        }

        return results;
    }

    iterFields(func) {
        const { fields } = this;
        for (let i = 0; i < fields.length; ++i) {
            func(this[fields[i]], fields[i]);
        }
    }
}
Node.prototype.typename = "Node";

export class Value extends Node {}
Value.prototype.typename = "Value";
Value.prototype.fields = ["value"];

export class NodeList extends Node {
    constructor(lineno, colno, nodes = []) {
        super(lineno, colno, nodes);
    }

    addChild(node) {
        this.children.push(node);
    }
}
NodeList.prototype.typename = "NodeList";
NodeList.prototype.fields = ["children"];

export class Root extends NodeList {}
Root.prototype.typename = "Root";

export class Literal extends Value {}
Literal.prototype.typename = "Literal";

export class Symbol extends Value {}
Symbol.prototype.typename = "Symbol";

export class Group extends NodeList {}
Group.prototype.typename = "Group";

export class Array extends NodeList {}
Array.prototype.typename = "Array";

export class Pair extends Node {}
Pair.prototype.typename = "Pair";
Pair.prototype.fields = ["key", "value"];

export class Dict extends NodeList {}
Dict.prototype.typename = "Dict";

export class LookupVal extends Node {}
LookupVal.prototype.typename = "LookupVal";
LookupVal.prototype.fields = ["target", "val"];

export class If extends Node {}
If.prototype.typename = "If";
If.prototype.fields = ["cond", "body", "else_"];

export class IfAsync extends If {}
IfAsync.prototype.typename = "IfAsync";

export class InlineIf extends Node {}
InlineIf.prototype.typename = "InlineIf";
InlineIf.prototype.fields = ["cond", "body", "else_"];

export class For extends Node {}
For.prototype.typename = "For";
For.prototype.fields = ["arr", "name", "body", "else_"];

export class AsyncEach extends For {}
AsyncEach.prototype.typename = "AsyncEach";

export class AsyncAll extends For {}
AsyncAll.prototype.typename = "AsyncAll";

export class Macro extends Node {}
Macro.prototype.typename = "Macro";
Macro.prototype.fields = ["name", "args", "body"];

export class Caller extends Macro {}
Caller.prototype.typename = "Caller";

export class Import extends Node {}
Import.prototype.typename = "Import";
Import.prototype.fields = ["template", "target", "withContext"];

export class FromImport extends Node {
    constructor(lineno, colno, template, names, withContext) {
        super(lineno, colno, template, names || new NodeList(), withContext);
    }
}
FromImport.prototype.typename = "FromImport";
FromImport.prototype.fields = ["template", "names", "withContext"];

export class FunCall extends Node {}
FunCall.prototype.typename = "FunCall";
FunCall.prototype.fields = ["name", "args"];

export class Filter extends FunCall {}
Filter.prototype.typename = "Filter";

export class FilterAsync extends Filter {}
FilterAsync.prototype.typename = "FilterAsync";
FilterAsync.prototype.fields = ["name", "args", "symbol"];

export class KeywordArgs extends Dict {}
KeywordArgs.prototype.typename = "KeywordArgs";

export class Block extends Node {}
Block.prototype.typename = "Block";
Block.prototype.fields = ["name", "body"];

export class Super extends Node {}
Super.prototype.typename = "Super";
Super.prototype.fields = ["blockName", "symbol"];

export class TemplateRef extends Node {}
TemplateRef.prototype.typename = "TemplateRef";
TemplateRef.prototype.fields = ["template"];


export class Extends extends TemplateRef {}
Extends.prototype.typename = "Extends";

export class Include extends Node {}
Include.prototype.typename = "Include";
Include.prototype.fields = ["template", "ignoreMissing"];

export class Set extends Node {}
Set.prototype.typename = "Set";
Set.prototype.fields = ["targets", "value"];

export class Output extends NodeList {}
Output.prototype.typename = "Output";

export class Capture extends Node {}
Capture.prototype.typename = "Capture";
Capture.prototype.fields = ["body"];

export class TemplateData extends Literal {}
TemplateData.prototype.typename = "TemplateData";

export class UnaryOp extends Node {}
UnaryOp.prototype.typename = "UnaryOp";
UnaryOp.prototype.fields = ["target"];

export class BinOp extends Node {}
BinOp.prototype.typename = "BinOp";
BinOp.prototype.fields = ["left", "right"];

export class In extends BinOp {}
In.prototype.typename = "In";

export class Or extends BinOp {}
Or.prototype.typename = "Or";

export class And extends BinOp {}
And.prototype.typename = "And";

export class Not extends UnaryOp {}
Not.prototype.typename = "Not";

export class Add extends BinOp {}
Add.prototype.typename = "Add";

export class Concat extends BinOp {}
Concat.prototype.typename = "Concat";

export class Sub extends BinOp {}
Sub.prototype.typename = "Sub";

export class Mul extends BinOp {}
Mul.prototype.typename = "Mul";

export class Div extends BinOp {}
Div.prototype.typename = "Div";

export class FloorDiv extends BinOp {}
FloorDiv.prototype.typename = "FloorDiv";

export class Mod extends BinOp {}
Mod.prototype.typename = "Mod";

export class Pow extends BinOp {}
Pow.prototype.typename = "Pow";

export class Neg extends UnaryOp {}
Neg.prototype.typename = "Neg";

export class Pos extends UnaryOp {}
Pos.prototype.typename = "Pos";

export class Compare extends Node {}
Compare.prototype.typename = "Compare";
Compare.prototype.fields = ["expr", "ops"];

export class CompareOperand extends Node {}
CompareOperand.prototype.typename = "CompareOperand";
CompareOperand.prototype.fields = ["expr", "type"];

export class CallExtension extends Node {
    constructor(ext, prop, args, contentArgs) {
        super(undefined, undefined, ext._name || ext, prop, args || new NodeList(), contentArgs || [], ext.autoescape);
    }
}
CallExtension.prototype.typename = "CallExtension";
CallExtension.prototype.fields = ["extName", "prop", "args", "contentArgs", "autoescape"];

export class CallExtensionAsync extends CallExtension {}
CallExtensionAsync.prototype.typename = "CallExtensionAsync";

// Print the AST in a nicely formatted tree format for debuggin
export const printNodes = (node, indent) => {
    indent = indent || 0;

    const print = (str, indent, inline) => {
        const lines = str.split("\n");

        for (let i = 0; i < lines.length; i++) {
            if (lines[i]) {
                if ((inline && i > 0) || !inline) {
                    for (let j = 0; j < indent; j++) {
                        process.stdout.write(" ");
                    }
                }
            }

            if (i === lines.length - 1) {
                process.stdout.write(lines[i]);
            } else {
                process.stdout.write(`${lines[i]}\n`);
            }
        }
    };

    print(`${node.typename}: `, indent);

    if (node instanceof NodeList) {
        print("\n");
        for (const n of node.children) {
            printNodes(n, indent + 2);
        }
    } else if (node instanceof CallExtension) {
        print(`${node.extName}.${node.prop}`);
        print("\n");

        if (node.args) {
            printNodes(node.args, indent + 2);
        }

        if (node.contentArgs) {
            for (const n of node.contentArgs) {
                printNodes(n, indent + 2);
            }
        }
    } else {
        let nodes = null;
        let props = null;

        node.iterFields((val, field) => {
            if (val instanceof Node) {
                nodes = nodes || {};
                nodes[field] = val;
            } else {
                props = props || {};
                props[field] = val;
            }
        });

        if (props) {
            print(`${JSON.stringify(props, null, 2)}\n`, null, true);
        } else {
            print("\n");
        }

        if (nodes) {
            for (const k in nodes) {
                printNodes(nodes[k], indent + 2);
            }
        }

    }
};
