const {
    fs,
    js: { compiler: { traverse } }
} = adone;

const STATE_PROGRAM = 1;
const STATE_IF_STMT = 2;
const STATE_UNARY_EXPR = 3;
const STATE_CONSEQUENT_BLOCK = 4;
const STATE_ADONE_DECL = 5;
const STATE_ADONE_PROTO = 6;
const STATE_LAZY_DEFS = 7;
const STATE_ADONE_LAZIFIERS = 8;

export default class XAdoneModule extends adone.js.adone.Module {
    async load() {
        this.code = await fs.readFile(this.filePath, { check: true, encoding: "utf8" });
        this.init();

        this._adoneProto = {};

        const lazies = [];

        let traverseState;

        traverse(this.ast, {
            enter: (path) => {
                const nodeType = path.node.type;
                switch (nodeType) {
                    case "Program": {
                        traverseState = STATE_PROGRAM;
                        return;
                    }
                    case "ExpressionStatement": {
                        if (traverseState === STATE_PROGRAM) {
                            path.skip();
                            
                        }
                        break;
                    }
                    case "IfStatement": {
                        if (traverseState === STATE_PROGRAM) {
                            traverseState = STATE_IF_STMT;
                        }
                        return;
                    }
                    case "UnaryExpression": {
                        if (traverseState === STATE_IF_STMT) {
                            traverseState = STATE_UNARY_EXPR;
                        }
                        path.skip();
                        return;
                    }
                    case "BlockStatement": {
                        if (traverseState === STATE_UNARY_EXPR) {
                            traverseState = STATE_CONSEQUENT_BLOCK;
                        } else {
                            path.skip();
                        }
                        return;
                    }
                    case "VariableDeclaration": {
                        if (traverseState < STATE_CONSEQUENT_BLOCK) {
                            path.skip();
                        } else {
                            traverseState = STATE_ADONE_DECL;
                        }
                        return;
                    }
                    case "ObjectExpression": {
                        if (traverseState === STATE_ADONE_DECL) {
                            traverseState = STATE_ADONE_PROTO;
                            
                        } else if (traverseState === STATE_LAZY_DEFS) {
                            traverseState = STATE_ADONE_LAZIFIERS;
                            
                        }
                        break;
                    }
                    case "ObjectProperty": {
                        if (traverseState === STATE_ADONE_PROTO) {
                            const node = path.node;
                            let protoPath;
                            path.traverse({
                                enter: (subPath) => {
                                    if (subPath.node.type === "Identifier") {
                                        subPath.skip();
                                        return;
                                    }
                                    protoPath = subPath;
                                    subPath.stop();
                                }
                            });
                            const xObj = this.createXObject({ path: protoPath, ast: protoPath.node, xModule: this });
                            xObj._adoneProto = true;
                            this._adoneProto[node.key.name] = xObj;
                            path.skip();
                            
                        } else if (traverseState === STATE_ADONE_LAZIFIERS) {
                            const basePath = adone.std.path.dirname(this.filePath);
                            const node = path.node;
                            const name = node.key.name;
                            const fullName = `adone.${name}`;
                            const { namespace, objectName } = adone.meta.parseName(fullName);
                            if (namespace === "adone") {
                                if (node.value.type === "StringLiteral") {
                                    lazies.push({ name: objectName, path: adone.std.path.join(basePath, node.value.value) });
                                } else if (node.value.type === "ArrowFunctionExpression") {
                                    let arrowFuncPath;
                                    path.traverse({
                                        enter: (subPath) => {
                                            if (subPath.node.type !== "ArrowFunctionExpression") {
                                                subPath.skip();
                                                return;
                                            }
                                            arrowFuncPath = subPath;
                                            subPath.stop();
                                        }
                                    });
                                    this._exports[name] = this.createXObject({ path: arrowFuncPath, ast: arrowFuncPath.node, kind: "const", xModule: this.xModule });
                                }
                            }
                            path.skip();
                            
                        }
                        break;
                    }
                    case "CallExpression": {
                        if (traverseState === STATE_CONSEQUENT_BLOCK) {
                            if (this._getMemberExpressionName(path.node.callee) === "adone.lazify" && path.node.arguments.length >= 2 &&
                                path.node.arguments[1].type === "Identifier" && path.node.arguments[1].name === "adone") {
                                traverseState = STATE_LAZY_DEFS;
                            }
                            
                        }
                        break;
                    }
                }
            },
            exit: (path) => {
                const nodeType = path.node.type;
                switch (nodeType) {
                    case "ObjectExpression": {
                        if (traverseState === STATE_ADONE_PROTO) {
                            traverseState = STATE_CONSEQUENT_BLOCK;
                        }
                        break;
                    }
                }
            }
        });

        if (lazies.length > 0) {
            for (const { name, path } of lazies) {
                const filePath = await fs.lookup(path);
                // adone.log(filePath);
                const lazyModule = new adone.js.adone.Module({ nsName: this.nsName, filePath });
                await lazyModule.load();
                this.lazies.set(name, lazyModule);
            }
        }
    }

    getType() {
        return "AdoneModule";
    }

    exports() {
        const result = super.exports();
        Object.assign(result, this._adoneProto);
        return result;
    }
}
