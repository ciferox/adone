import { TemplateError } from "./x";
import * as parser from "./parser";
import * as transformer from "./transformer";
import * as nodes from "./nodes";
import { Frame } from "./runtime";

const { is, exception } = adone;

const compareOps = new Map([
    ["==", "=="],
    ["===", "==="],
    ["!=", "!="],
    ["!==", "!=="],
    ["<", "<"],
    [">", ">"],
    ["<=", "<="],
    [">=", ">="]
]);

const binOpEmitter = (str) => function opEmitter(node, frame) {
    this.compile(node.left, frame);
    this.emit(str);
    this.compile(node.right, frame);
};

export class Compiler {
    constructor(templateName, throwOnUndefined) {
        this.templateName = templateName;
        this.codebuf = [];
        this.lastId = 0;
        this.buffer = null;
        this.bufferStack = [];
        this.scopeClosers = "";
        this.inBlock = false;
        this.throwOnUndefined = throwOnUndefined;
    }

    fail(msg, lineno, colno) {
        if (!is.undefined(lineno)) {
            lineno += 1;
        }
        if (!is.undefined(colno)) {
            colno += 1;
        }

        throw new TemplateError(msg, lineno, colno);
    }

    pushBufferId(id) {
        this.bufferStack.push(this.buffer);
        this.buffer = id;
        this.emit(`var ${this.buffer} = "";`);
    }

    popBufferId() {
        this.buffer = this.bufferStack.pop();
    }

    emit(code) {
        this.codebuf.push(code);
    }

    emitLine(code) {
        this.emit(`${code}\n`);
    }

    emitLines(...args) {
        for (let i = 0; i < args.length; ++i) {
            this.emitLine(args[i]);
        }
    }

    emitFuncBegin(name) {
        this.buffer = "output";
        this.scopeClosers = "";
        this.emitLine(`function ${name}(env, context, frame, runtime, cb) {`);
        this.emitLine("var lineno = null;");
        this.emitLine("var colno = null;");
        this.emitLine(`var ${this.buffer} = "";`);
        this.emitLine("try {");
    }

    emitFuncEnd(noReturn) {
        if (!noReturn) {
            this.emitLine(`cb(null, ${this.buffer});`);
        }

        this.closeScopeLevels();
        this.emitLine("} catch (e) {");
        this.emitLine("  cb(runtime.handleError(e, lineno, colno));");
        this.emitLine("}");
        this.emitLine("}");
        this.buffer = null;
    }

    addScopeLevel() {
        this.scopeClosers += "})";
    }

    closeScopeLevels() {
        this.emitLine(`${this.scopeClosers};`);
        this.scopeClosers = "";
    }

    withScopedSyntax(func) {
        const scopeClosers = this.scopeClosers;
        this.scopeClosers = "";

        func.call(this);

        this.closeScopeLevels();
        this.scopeClosers = scopeClosers;
    }

    makeCallback(res) {
        const err = this.tmpid();

        return `function(${err}${res ? `,${res}` : ""}) {\nif(${err}) { cb(${err}); return; }`;
    }

    tmpid() {
        return `t_${++this.lastId}`;
    }

    _templateName() {
        return is.nil(this.templateName) ? "undefined" : JSON.stringify(this.templateName);
    }

    _compileChildren(node, frame) {
        const children = node.children;
        for (let i = 0; i < children.length; i++) {
            this.compile(children[i], frame);
        }
    }

    _compileAggregate(node, frame, startChar, endChar) {
        if (startChar) {
            this.emit(startChar);
        }

        for (let i = 0; i < node.children.length; i++) {
            if (i > 0) {
                this.emit(",");
            }

            this.compile(node.children[i], frame);
        }

        if (endChar) {
            this.emit(endChar);
        }
    }

    _compileExpression(node, frame) {
        // TODO: is this type check is worth it or not ?
        this.assertType(
            node,
            nodes.Literal,
            nodes.Symbol,
            nodes.Group,
            nodes.Array,
            nodes.Dict,
            nodes.FunCall,
            nodes.Caller,
            nodes.Filter,
            nodes.LookupVal,
            nodes.Compare,
            nodes.InlineIf,
            nodes.In,
            nodes.And,
            nodes.Or,
            nodes.Not,
            nodes.Add,
            nodes.Concat,
            nodes.Sub,
            nodes.Mul,
            nodes.Div,
            nodes.FloorDiv,
            nodes.Mod,
            nodes.Pow,
            nodes.Neg,
            nodes.Pos,
            nodes.Compare,
            nodes.NodeList
        );
        this.compile(node, frame);
    }

    assertType(node, ...types) {
        let success = false;

        for (let i = 0; i < types.length; i++) {
            if (node instanceof types[i]) {
                success = true;
            }
        }

        if (!success) {
            this.fail(`assertType: invalid type: ${node.typename}`, node.lineno, node.colno);
        }
    }

    compileCallExtension(node, frame, async) {
        const args = node.args;
        const contentArgs = node.contentArgs;
        const autoescape = is.boolean(node.autoescape) ? node.autoescape : true;

        if (!async) {
            this.emit(`${this.buffer} += runtime.suppressValue(`);
        }

        this.emit(`env.getExtension("${node.extName}")["${node.prop}"](`);
        this.emit("context");

        if (args || contentArgs) {
            this.emit(",");
        }

        if (args) {
            if (!(args instanceof nodes.NodeList)) {
                this.fail("compileCallExtension: arguments must be a NodeList, use `parser.parseSignature`");
            }

            const { children } = args;

            for (let i = 0; i < children.length; ++i) {
                this._compileExpression(children[i], frame);
                if (i !== children.length - 1 || contentArgs.length) {
                    this.emit(",");
                }
            }
        }

        for (let i = 0; i < contentArgs.length; ++i) {
            if (i > 0) {
                this.emit(",");
            }
            const arg = contentArgs[i];

            if (arg) {
                const id = this.tmpid();

                this.emitLine("function(cb) {");
                this.emitLine("if(!cb) { cb = function(err) { if(err) { throw err; }}}");
                this.pushBufferId(id);

                this.withScopedSyntax(() => {
                    this.compile(arg, frame);
                    this.emitLine(`cb(null, ${id});`);
                });

                this.popBufferId();
                this.emitLine(`return ${id};`);
                this.emitLine("}");
            } else {
                this.emit("null");
            }
        }

        if (async) {
            const res = this.tmpid();
            this.emitLine(`, ${this.makeCallback(res)}`);
            this.emitLine(`${this.buffer} += runtime.suppressValue(${res}, ${autoescape} && env.opts.autoescape);`);
            this.addScopeLevel();
        } else {
            this.emit(")");
            this.emit(`, ${autoescape} && env.opts.autoescape);\n`);
        }
    }

    compileCallExtensionAsync(node, frame) {
        this.compileCallExtension(node, frame, true);
    }

    compileNodeList(node, frame) {
        this._compileChildren(node, frame);
    }

    compileLiteral(node) {
        if (is.string(node.value)) {
            let val = node.value.replace(/\\/g, "\\\\");
            val = val.replace(/"/g, '\\"');
            val = val.replace(/\n/g, "\\n");
            val = val.replace(/\r/g, "\\r");
            val = val.replace(/\t/g, "\\t");
            this.emit(`"${val}"`);
        } else if (is.null(node.value)) {
            this.emit("null");
        } else {
            this.emit(node.value.toString());
        }
    }

    compileSymbol(node, frame) {
        const name = node.value;
        const v = frame.lookup(name);

        if (v) {
            this.emit(v);
        } else {
            this.emit(`runtime.contextOrFrameLookup(context, frame, "${name}")`);
        }
    }

    compileGroup(node, frame) {
        this._compileAggregate(node, frame, "(", ")");
    }

    compileArray(node, frame) {
        this._compileAggregate(node, frame, "[", "]");
    }

    compileDict(node, frame) {
        this._compileAggregate(node, frame, "{", "}");
    }

    compilePair(node, frame) {
        let key = node.key;
        const val = node.value;

        if (key instanceof nodes.Symbol) {
            key = new nodes.Literal(key.lineno, key.colno, key.value);
        } else if (!(key instanceof nodes.Literal && is.string(key.value))) {
            this.fail("compilePair: Dict keys must be strings or names", key.lineno, key.colno);
        }

        this.compile(key, frame);
        this.emit(": ");
        this._compileExpression(val, frame);
    }

    compileInlineIf(node, frame) {
        this.emit("(");
        this.compile(node.cond, frame);
        this.emit("?");
        this.compile(node.body, frame);
        this.emit(":");
        if (!is.null(node.else_)) {
            this.compile(node.else_, frame);
        } else {
            this.emit('""');
        }
        this.emit(")");
    }

    compileIn(node, frame) {
        this.emit("runtime.inOperator(");
        this.compile(node.left, frame);
        this.emit(",");
        this.compile(node.right, frame);
        this.emit(")");
    }

    compileIs(node, frame) {
        // first, we need to try to get the name of the test function, if it's a
        // callable (i.e., has args) and not a symbol.
        const right = node.right.name
            ? node.right.name.value
            // otherwise go with the symbol value
            : node.right.value;
        this.emit(`env.getTest("${right}").call(context, `);
        this.compile(node.left, frame);
        // compile the arguments for the callable if they exist
        if (node.right.args) {
            this.emit(",");
            this.compile(node.right.args, frame);
        }
        this.emit(") === true");
    }

    compileNot(node, frame) {
        this.emit("!");
        this.compile(node.target, frame);
    }

    compileFloorDiv(node, frame) {
        this.emit("Math.floor(");
        this.compile(node.left, frame);
        this.emit(" / ");
        this.compile(node.right, frame);
        this.emit(")");
    }

    compilePow(node, frame) {
        this.emit("Math.pow(");
        this.compile(node.left, frame);
        this.emit(", ");
        this.compile(node.right, frame);
        this.emit(")");
    }

    compileNeg(node, frame) {
        this.emit("-");
        this.compile(node.target, frame);
    }

    compilePos(node, frame) {
        this.emit("+");
        this.compile(node.target, frame);
    }

    compileCompare(node, frame) {
        this.compile(node.expr, frame);

        for (let i = 0; i < node.ops.length; i++) {
            const n = node.ops[i];
            this.emit(` ${compareOps.get(n.type)} `);
            this.compile(n.expr, frame);
        }
    }

    compileLookupVal(node, frame) {
        this.emit("runtime.memberLookup((");
        this._compileExpression(node.target, frame);
        this.emit("),");
        this._compileExpression(node.val, frame);
        this.emit(")");
    }

    _getNodeName(node) {
        switch (node.typename) {
            case "Symbol": {
                return node.value;
            }
            case "FunCall": {
                return `the return value of (${this._getNodeName(node.name)})`;
            }
            case "LookupVal": {
                return `${this._getNodeName(node.target)}["${this._getNodeName(node.val)}"]`;
            }
            case "Literal": {
                return node.value.toString();
            }
            default: {
                return "--expression--";
            }
        }
    }

    compileFunCall(node, frame) {
        // Keep track of line/col info at runtime by settings variables within an expression.
        // An expression in javascript like (x, y, z) returns the last value,
        // and x and y can be anything
        this.emit(`(lineno = ${node.lineno}, colno = ${node.colno}, `);

        this.emit("runtime.callWrap(");
        // Compile it as normal.
        this._compileExpression(node.name, frame);

        // Output the name of what we're calling so we can get friendly errors if the lookup fails.
        this.emit(`, "${this._getNodeName(node.name).replace(/"/g, '\\"')}", context, `);

        this._compileAggregate(node.args, frame, "[", "])");

        this.emit(")");
    }

    compileFilter(node, frame) {
        const name = node.name;
        this.assertType(name, nodes.Symbol);
        this.emit(`env.getFilter("${name.value}").call(context, `);
        this._compileAggregate(node.args, frame);
        this.emit(")");
    }

    compileFilterAsync(node, frame) {
        const name = node.name;
        this.assertType(name, nodes.Symbol);

        const symbol = node.symbol.value;
        frame.set(symbol, symbol);

        this.emit(`env.getFilter("${name.value}").call(context, `);
        this._compileAggregate(node.args, frame);
        this.emitLine(`, ${this.makeCallback(symbol)}`);

        this.addScopeLevel();
    }

    compileKeywordArgs(node, frame) {
        // ?

        // const names = [];
        // lib.each(node.children, (pair) => {
        //     names.push(pair.key.value);
        // });

        this.emit("runtime.makeKeywordArgs(");
        this.compileDict(node, frame);
        this.emit(")");
    }

    compileSet(node, frame) {
        const ids = [];

        // Lookup the variable names for each identifier and create new ones if necessary
        const { targets } = node;
        for (let i = 0; i < node.targets.length; ++i) {
            const { value: name } = targets[i];
            let id = frame.lookup(name);

            if (is.nil(id)) {
                id = this.tmpid();

                // Note: This relies on js allowing scope across blocks,
                // in case this is created inside an `if`
                this.emitLine(`var ${id};`);
            }

            ids.push(id);
        }

        if (node.value) {
            this.emit(`${ids.join(" = ")} = `);
            this._compileExpression(node.value, frame);
            this.emitLine(";");
        } else {
            this.emit(`${ids.join(" = ")} = `);
            this.compile(node.body, frame);
            this.emitLine(";");
        }

        for (let i = 0; i < targets.length; ++i) {
            const id = ids[i];
            const { value: name } = targets[i];

            // We are running this for every var, but it's very
            // uncommon to assign to multiple vars anyway
            this.emitLine(`frame.set("${name}", ${id}, true);`);

            this.emitLine("if(frame.topLevel) {");
            this.emitLine(`context.setVariable("${name}", ${id});`);
            this.emitLine("}");

            if (name.charAt(0) !== "_") {
                this.emitLine("if(frame.topLevel) {");
                this.emitLine(`context.addExport("${name}", ${id});`);
                this.emitLine("}");
            }
        }
    }

    compileSwitch(node, frame) {
        this.emit("switch (");
        this.compile(node.expr, frame);
        this.emit(") {");
        for (let i = 0; i < node.cases.length; i += 1) {
            const c = node.cases[i];
            this.emit("case ");
            this.compile(c.cond, frame);
            this.emit(": ");
            this.compile(c.body, frame);
            // preserve fall-throughs
            if (c.body.children.length) {
                this.emitLine("break;");
            }
        }
        if (node.default) {
            this.emit("default:");
            this.compile(node.default, frame);
        }
        this.emit("}");
    }

    compileIf(node, frame, async) {
        this.emit("if(");
        this._compileExpression(node.cond, frame);
        this.emitLine(") {");

        this.withScopedSyntax(() => {
            this.compile(node.body, frame);

            if (async) {
                this.emit("cb()");
            }
        });

        if (node.else_) {
            this.emitLine("}\nelse {");

            this.withScopedSyntax(() => {
                this.compile(node.else_, frame);

                if (async) {
                    this.emit("cb()");
                }
            });
        } else if (async) {
            this.emitLine("}\nelse {");
            this.emit("cb()");
        }

        this.emitLine("}");
    }

    compileIfAsync(node, frame) {
        this.emit("(function(cb) {");
        this.compileIf(node, frame, true);
        this.emit(`})(${this.makeCallback()}`);
        this.addScopeLevel();
    }

    emitLoopBindings(node, arr, i, len) {
        const bindings = {
            index: `${i} + 1`,
            index0: i,
            revindex: `${len} - ${i}`,
            revindex0: `${len} - ${i} - 1`,
            first: `${i} === 0`,
            last: `${i} === ${len} - 1`,
            length: len
        };

        for (const name in bindings) {
            this.emitLine(`frame.set("loop.${name}", ${bindings[name]});`);
        }
    }

    compileFor(node, frame) {
        // Some of this code is ugly, but it keeps the generated code as fast as possible.
        // ForAsync also shares some of this, but not much.

        frame = frame.push();
        const i = this.tmpid();
        const len = this.tmpid();
        const arr = this.tmpid();
        let v;

        this.emitLine("frame = frame.push();");

        this.emit(`var ${arr} = `);
        this._compileExpression(node.arr, frame);
        this.emitLine(";");

        this.emit(`if(${arr}) {`);

        // If multiple names are passed, we need to bind them appropriately
        if (node.name instanceof nodes.Array) {
            this.emitLine(`var ${i};`);

            // The object could be an arroy or object. Note that the
            // body of the loop is duplicated for each condition, but
            // we are optimizing for speed over size.
            this.emitLine(`if(runtime.isArray(${arr})) {`); {
                this.emitLine(`var ${len} = ${arr}.length;`);
                this.emitLine(`for(${i}=0; ${i} < ${arr}.length; ${i}++) {`);

                // Bind each declared var
                for (let u = 0; u < node.name.children.length; u++) {
                    const tid = this.tmpid();
                    this.emitLine(`var ${tid} = ${arr}[${i}][${u}]`);
                    this.emitLine(`frame.set("${node.name.children[u].value}", ${arr}[${i}][${u}]` + ");");
                    frame.set(node.name.children[u].value, tid);
                }

                this.emitLoopBindings(node, arr, i, len);
                this.withScopedSyntax(() => {
                    this.compile(node.body, frame);
                });
                this.emitLine("}");
            }

            this.emitLine("} else {"); {
                // Iterate over the key/values of an object
                const key = node.name.children[0];
                const val = node.name.children[1];
                const k = this.tmpid();
                v = this.tmpid();
                frame.set(key.value, k);
                frame.set(val.value, v);

                this.emitLine(`${i} = -1;`);
                this.emitLine(`var ${len} = runtime.keys(${arr}).length;`);
                this.emitLine(`for(var ${k} in ${arr}) {`);
                this.emitLine(`${i}++;`);
                this.emitLine(`var ${v} = ${arr}[${k}];`);
                this.emitLine(`frame.set("${key.value}", ${k});`);
                this.emitLine(`frame.set("${val.value}", ${v});`);

                this.emitLoopBindings(node, arr, i, len);
                this.withScopedSyntax(() => {
                    this.compile(node.body, frame);
                });
                this.emitLine("}");
            }

            this.emitLine("}");
        } else {
            // Generate a typical array iteration
            v = this.tmpid();
            frame.set(node.name.value, v);

            this.emitLine(`var ${len} = ${arr}.length;`);
            this.emitLine(`for(var ${i}=0; ${i} < ${arr}.length; ${i}++) {`);
            this.emitLine(`var ${v} = ${arr}[${i}];`);
            this.emitLine(`frame.set("${node.name.value}", ${v});`);

            this.emitLoopBindings(node, arr, i, len);

            this.withScopedSyntax(() => {
                this.compile(node.body, frame);
            });

            this.emitLine("}");
        }

        this.emitLine("}");
        if (node.else_) {
            this.emitLine(`if (!${len}) {`);
            this.compile(node.else_, frame);
            this.emitLine("}");
        }

        this.emitLine("frame = frame.pop();");
    }

    _compileAsyncLoop(node, frame, parallel) {
        // This shares some code with the For tag, but not enough to worry about.
        // This iterates across an object asynchronously, but not in parallel.

        const i = this.tmpid();
        const len = this.tmpid();
        const arr = this.tmpid();
        const asyncMethod = parallel ? "asyncAll" : "asyncEach";
        frame = frame.push();

        this.emitLine("frame = frame.push();");

        this.emit(`var ${arr} = `);
        this._compileExpression(node.arr, frame);
        this.emitLine(";");

        if (node.name instanceof nodes.Array) {
            const { name: { children } } = node;
            this.emit(`runtime.${asyncMethod}(${arr}, ${children.length}, function(`);

            for (let i = 0; i < children.length; ++i) {
                this.emit(`${children[i].value},`);
            }

            this.emit(`${i},${len},next) {`);

            for (let i = 0; i < children.length; ++i) {
                const { value: id } = children[i];
                frame.set(id, id);
                this.emitLine(`frame.set("${id}", ${id});`);
            }
        } else {
            const { name: { value: id } } = node;
            this.emitLine(`runtime.${asyncMethod}(${arr}, 1, function(${id}, ${i}, ${len},next) {`);
            this.emitLine(`frame.set("${id}", ${id});`);
            frame.set(id, id);
        }

        this.emitLoopBindings(node, arr, i, len);

        this.withScopedSyntax(() => {
            let buf;
            if (parallel) {
                buf = this.tmpid();
                this.pushBufferId(buf);
            }

            this.compile(node.body, frame);
            this.emitLine(`next(${i}${buf ? `,${buf}` : ""});`);

            if (parallel) {
                this.popBufferId();
            }
        });

        const output = this.tmpid();
        this.emitLine(`}, ${this.makeCallback(output)}`);
        this.addScopeLevel();

        if (parallel) {
            this.emitLine(`${this.buffer} += ${output};`);
        }

        if (node.else_) {
            this.emitLine(`if (!${arr}.length) {`);
            this.compile(node.else_, frame);
            this.emitLine("}");
        }

        this.emitLine("frame = frame.pop();");
    }

    compileAsyncEach(node, frame) {
        this._compileAsyncLoop(node, frame);
    }

    compileAsyncAll(node, frame) {
        this._compileAsyncLoop(node, frame, true);
    }

    _compileMacro(node, frame) {
        const args = [];
        let kwargs = null;
        const funcId = `macro_${this.tmpid()}`;
        const keepFrame = !is.undefined(frame);

        const { args: { children } } = node;
        for (let i = 0; i < children.length; ++i) {
            const arg = children[i];
            if (i === node.args.children.length - 1 && arg instanceof nodes.Dict) {
                kwargs = arg;
            } else {
                this.assertType(arg, nodes.Symbol);
                args.push(arg);
            }
        }

        const realNames = [];

        const argNames = [];

        for (let i = 0; i < args.length; ++i) {
            const { value } = args[i];
            realNames.push(`l_${value}`);
            argNames.push(`"${value}"`);
        }
        realNames.push("kwargs");

        const kwargNames = [];
        if (kwargs) {
            const { children } = kwargs;
            if (children) {
                for (let i = 0; i < children.length; ++i) {
                    kwargNames.push(`"${children[i].key.value}"`);
                }
            }
        }
        if (keepFrame) {
            frame = frame.push(true);
        } else {
            frame = new Frame();
        }
        this.emitLines(
            `var ${funcId} = runtime.makeMacro(`,
            `[${argNames.join(", ")}], `,
            `[${kwargNames.join(", ")}], `,
            `function (${realNames.join(", ")}) {`,
            "var callerFrame = frame;",
            `frame = ${(keepFrame) ? "frame.push(true);" : "new runtime.Frame();"}`,
            "kwargs = kwargs || {};",
            'if (Object.prototype.hasOwnProperty.call(kwargs, "caller")) {',
            'frame.set("caller", kwargs.caller); }'
        );

        for (let i = 0; i < args.length; ++i) {
            const arg = args[i];
            this.emitLine(`frame.set("${arg.value}", ` +
                `l_${arg.value});`);
            frame.set(arg.value, `l_${arg.value}`);
        }

        if (kwargs) {
            const { children } = kwargs;
            for (let i = 0; i < children.length; ++i) {
                const { key: { value: name }, value } = children[i];
                this.emit(`frame.set("${name}", Object.prototype.hasOwnProperty.call(kwargs, "${name}") ? kwargs["${name}"] : `);
                this._compileExpression(value, frame);
                this.emitLine(");");
            }
        }

        const bufferId = this.tmpid();
        this.pushBufferId(bufferId);

        this.withScopedSyntax(() => {
            this.compile(node.body, frame);
        });

        this.emitLine(`frame = ${(keepFrame) ? "frame.pop();" : "callerFrame;"}`);
        this.emitLine(`return new runtime.SafeString(${bufferId});`);
        this.emitLine("});");
        this.popBufferId();

        return funcId;
    }

    compileMacro(node, frame) {
        const funcId = this._compileMacro(node);

        const { name: { value: name } } = node;
        frame.set(name, funcId);

        if (frame.parent) {
            this.emitLine(`frame.set("${name}", ${funcId});`);
        } else {
            if (node.name.value.charAt(0) !== "_") {
                this.emitLine(`context.addExport("${name}");`);
            }
            this.emitLine(`context.setVariable("${name}", ${funcId});`);
        }
    }

    compileCaller(node, frame) {
        this.emit("(function (){");
        const funcId = this._compileMacro(node, frame);
        this.emit(`return ${funcId};})()`);
    }

    compileImport(node, frame) {
        const id = this.tmpid();
        const { target: { value: target } } = node;

        this.emit("env.getTemplate(");
        this._compileExpression(node.template, frame);
        this.emitLine(`, false, ${this._templateName()}, false, ${this.makeCallback(id)}`);
        this.addScopeLevel();

        this.emitLine(`${id}.getExported(${node.withContext ? "context.getVariables(), frame, " : ""}${this.makeCallback(id)}`);
        this.addScopeLevel();

        frame.set(target, id);

        if (frame.parent) {
            this.emitLine(`frame.set("${target}", ${id});`);
        } else {
            this.emitLine(`context.setVariable("${target}", ${id});`);
        }
    }

    compileFromImport(node, frame) {
        const importedId = this.tmpid();

        this.emit("env.getTemplate(");
        this._compileExpression(node.template, frame);
        this.emitLine(`, false, ${this._templateName()}, false, ${this.makeCallback(importedId)}`);
        this.addScopeLevel();

        this.emitLine(`${importedId}.getExported(${node.withContext ? "context.getVariables(), frame, " : ""}${this.makeCallback(importedId)}`);
        this.addScopeLevel();

        const { names: { children } } = node;
        for (let i = 0; i < children.length; ++i) {
            const nameNode = children[i];
            const id = this.tmpid();

            let name;
            let alias;
            if (nameNode instanceof nodes.Pair) {
                name = nameNode.key.value;
                alias = nameNode.value.value;
            } else {
                name = nameNode.value;
                alias = name;
            }

            this.emitLine(`if(Object.prototype.hasOwnProperty.call(${importedId}, "${name}")) {`);
            this.emitLine(`var ${id} = ${importedId}.${name};`);
            this.emitLine("} else {");
            this.emitLine(`cb(new Error("cannot import '${name}'")); return;`);
            this.emitLine("}");

            frame.set(alias, id);

            if (frame.parent) {
                this.emitLine(`frame.set("${alias}", ${id});`);
            } else {
                this.emitLine(`context.setVariable("${alias}", ${id});`);
            }
        }
    }

    compileBlock(node) {
        const id = this.tmpid();

        // If we are executing outside a block (creating a top-level block),
        // we really don't want to execute its code because it will execute twice:
        // once when the child template runs and again when the parent template runs.
        // Note that blocks within blocks will *always* execute immediately *and*
        // wherever else they are invoked (like used in a parent template).
        // This may have behavioral differences from jinja because blocks can have side effects,
        // but it seems like a waste of performance to always execute huge top-level blocks twice
        if (!this.inBlock) {
            this.emit('(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : ');
        }
        this.emit(`context.getBlock("${node.name.value}")`);
        if (!this.inBlock) {
            this.emit(")");
        }
        this.emitLine(`(env, context, frame, runtime, ${this.makeCallback(id)}`);
        this.emitLine(`${this.buffer} += ${id};`);
        this.addScopeLevel();
    }

    compileSuper(node, frame) {
        const {
            blockName: { value: name },
            symbol: { value: id }
        } = node;

        this.emitLine(`context.getSuper(env, "${name}", b_${name}, frame, runtime, ${this.makeCallback(id)}`);
        this.emitLine(`${id} = runtime.markSafe(${id});`);
        this.addScopeLevel();
        frame.set(id, id);
    }

    compileExtends(node, frame) {
        const k = this.tmpid();

        this.emit("env.getTemplate(");
        this._compileExpression(node.template, frame);
        this.emitLine(`, true, ${this._templateName()}, false, ${this.makeCallback("_parentTemplate")}`);

        // extends is a dynamic tag and can occur within a block like `if`,
        // so if this happens we need to capture the parent template in the top-level scope
        this.emitLine("parentTemplate = _parentTemplate");

        this.emitLine(`for(var ${k} in parentTemplate.blocks) {`);
        this.emitLine(`context.addBlock(${k}, parentTemplate.blocks[${k}]);`);
        this.emitLine("}");

        this.addScopeLevel();
    }

    compileInclude(node, frame) {
        const id = this.tmpid();
        const id2 = this.tmpid();

        this.emitLine("var tasks = [];");
        this.emitLine("tasks.push(");
        this.emitLine("function(callback) {");
        this.emit("env.getTemplate(");
        this._compileExpression(node.template, frame);
        this.emitLine(`, false, ${this._templateName()}, ${node.ignoreMissing}, ${this.makeCallback(id)}`);
        this.emitLine(`callback(null,${id});});`);
        this.emitLine("});");

        this.emitLine("tasks.push(");
        this.emitLine("function(template, callback){");
        this.emitLine(`template.render(context.getVariables(), frame, ${this.makeCallback(id2)}`);
        this.emitLine(`callback(null,${id2});});`);
        this.emitLine("});");

        this.emitLine("tasks.push(");
        this.emitLine("function(result, callback){");
        this.emitLine(`${this.buffer} += result;`);
        this.emitLine("callback(null);");
        this.emitLine("});");
        this.emitLine("env.waterfall(tasks, function(){");
        this.addScopeLevel();
    }

    compileTemplateData(node, frame) {
        this.compileLiteral(node, frame);
    }

    compileCapture(node, frame) {
        // we need to temporarily override the current buffer id as 'output'
        // so the set block writes to the capture output instead of the buffer
        const buffer = this.buffer;
        this.buffer = "output";
        this.emitLine("(function() {");
        this.emitLine('var output = "";');
        this.withScopedSyntax(() => {
            this.compile(node.body, frame);
        });
        this.emitLine("return output;");
        this.emitLine("})()");
        // and of course, revert back to the old buffer id
        this.buffer = buffer;
    }

    compileOutput(node, frame) {
        const { children } = node;
        for (let i = 0; i < children.length; i++) {
            // TemplateData is a special case because it is never autoescaped,
            // so simply output it for optimization
            if (children[i] instanceof nodes.TemplateData) {
                if (children[i].value) {
                    this.emit(`${this.buffer} += `);
                    this.compileLiteral(children[i], frame);
                    this.emitLine(";");
                }
            } else {
                this.emit(`${this.buffer} += runtime.suppressValue(`);
                if (this.throwOnUndefined) {
                    this.emit("runtime.ensureDefined(");
                }
                this.compile(children[i], frame);
                if (this.throwOnUndefined) {
                    this.emit(`,${node.lineno},${node.colno})`);
                }
                this.emit(", env.opts.autoescape);\n");
            }
        }
    }

    compileRoot(node, frame) {
        if (frame) {
            this.fail("compileRoot: root node can't have frame");
        }

        frame = new Frame();

        this.emitLine("(() => {");
        this.emitFuncBegin("root");
        this.emitLine("var parentTemplate = null;");
        this._compileChildren(node, frame);
        this.emitLine("if(parentTemplate) {");
        this.emitLine("parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);");
        this.emitLine("} else {");
        this.emitLine(`cb(null, ${this.buffer});`);
        this.emitLine("}");
        this.emitFuncEnd(true);

        this.inBlock = true;

        const blockNames = [];

        const blocks = node.findAll(nodes.Block);
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const name = block.name.value;

            if (blockNames.includes(name)) {
                throw new exception.IllegalState(`Block "${name}" defined more than once.`);
            }
            blockNames.push(name);

            this.emitFuncBegin(`b_${name}`);

            const tmpFrame = new Frame();
            this.emitLine("var frame = frame.push(true);");
            this.compile(block.body, tmpFrame);
            this.emitFuncEnd();
        }

        this.emitLine("return {");
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const name = `b_${block.name.value}`;
            this.emitLine(`${name}: ${name},`);
        }
        this.emitLine("root: root\n};\n})");
    }

    compile(node, frame) {
        const _compile = this[`compile${node.typename}`];
        if (_compile) {
            _compile.call(this, node, frame);
        } else {
            this.fail(`compile: Cannot compile node: ${node.typename}`, node.lineno, node.colno);
        }
    }

    getCode() {
        return this.codebuf.join("");
    }
}

Compiler.prototype.compileOr = binOpEmitter(" || ");
Compiler.prototype.compileAnd = binOpEmitter(" && ");
Compiler.prototype.compileAdd = binOpEmitter(" + ");
// ensure concatenation instead of addition by adding empty string in between
Compiler.prototype.compileConcat = binOpEmitter(' + "" + ');
Compiler.prototype.compileSub = binOpEmitter(" - ");
Compiler.prototype.compileMul = binOpEmitter(" * ");
Compiler.prototype.compileDiv = binOpEmitter(" / ");
Compiler.prototype.compileMod = binOpEmitter(" % ");

export const compile = (src, asyncFilters, extensions, name, opts) => {
    const c = new Compiler(name, opts.throwOnUndefined);

    if (extensions && extensions.length !== 0) {
        for (let i = 0; i < extensions.length; i++) {
            if (is.propertyOwned(extensions[i], "preprocess")) {
                src = extensions[i].preprocess(src, name);
            }
        }
    }

    c.compile(transformer.transform(parser.parse(src, extensions, opts), asyncFilters, name));
    return c.getCode();
};
