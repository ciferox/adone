const { is, fs, js: { compiler: { traverse } } } = adone;

export default class XAdoneModule extends adone.meta.code.Module {
    async load() {
        this.code = await fs.readFile(this.filePath, { check: true, encoding: "utf8" });
        this.init();

        const lazies = [];

        let isIndexFile = false;
        let isConsequent = false;
        let consequentBlock = null;

        traverse(this.ast, {
            enter: (path) => {
                const nodeType = path.node.type;
                if (nodeType === "Program") {
                    return;
                } else if (nodeType === "ExpressionStatement" && this._isLazifier(path.node.expression)) {
                    // Process adone lazyfier
                    const callExpr = path.node.expression;
                    if (adone.meta.code.nodeInfo(callExpr.arguments[0]) === "ObjectExpression" &&
                        adone.meta.code.nodeInfo(callExpr.arguments[1]) === "Identifier:exports" &&
                        adone.meta.code.nodeInfo(callExpr.arguments[2]) === "Identifier:require") {

                        const props = callExpr.arguments[0].properties;
                        const basePath = adone.std.path.dirname(this.filePath);

                        for (const prop of props) {
                            const name = prop.key.name;
                            const fullName = `${this.nsName}.${name}`;
                            const { namespace, objectName } = adone.meta.parseName(fullName);
                            if (namespace === this.nsName) {
                                if (prop.value.type === "StringLiteral") {
                                    lazies.push({ name: objectName, path: adone.std.path.join(basePath, prop.value.value) });
                                }
                            }
                        }
                    }
                } else if (nodeType === "IfStatement") {
                    const relIndexPath = adone.std.path.normalize("/adone/src/index.js");
                    if (this.filePath.endsWith(relIndexPath)) {
                        isIndexFile = true;
                        return;
                    }
                }

                if (isIndexFile) {
                    if (!isConsequent) {
                        if (nodeType === "UnaryExpression") {
                            path.skip();
                            return;
                        } else {
                            isConsequent = true;
                            consequentBlock = path.node;
                            return;
                        }
                    }
                }

                if (isIndexFile && path.parent !== consequentBlock) {
                    path.skip();
                    return;
                }

                // adone.log(nodeType);

                let isDefault = undefined;
                const expandDeclaration = (realPath) => {
                    const node = realPath.node;

                    if (["ExportDefaultDeclaration", "ExportNamedDeclaration"].includes(node.type)) {
                        isDefault = (node.type === "ExportDefaultDeclaration");
                        let subPath;
                        realPath.traverse({
                            enter(p) {
                                subPath = p;
                                p.stop();
                            }
                        });
                        return expandDeclaration(subPath);
                    } else if (node.type === "VariableDeclaration") {
                        if (node.declarations.length > 1) {
                            throw new SyntaxError("Detected unsupported declaration of multiple variables.");
                        }
                        this._traverseVariableDeclarator(node.declarations[0], node.kind);
                        realPath.traverse({
                            enter(subPath) {
                                realPath = subPath;
                                subPath.stop();
                            }
                        });
                    }

                    return realPath;
                };

                const realPath = expandDeclaration(path);
                const node = realPath.node;
                const xObjData = {
                    ast: node,
                    path: realPath,
                    xModule: this
                };
                if (nodeType.endsWith("Declaration")) {
                    xObjData.kind = path.node.kind;
                }

                const xObj = this.createXObject(xObjData);
                this.addToScope(xObj);

                if (!is.undefined(isDefault)) {
                    switch (node.type) {
                        case "ClassDeclaration": {
                            if (is.null(node.id)) {
                                throw new adone.x.NotValid("Anonymous class");
                            }
                            this._exports[isDefault ? "default" : node.id.name] = xObj;
                            break;
                        }
                        case "VariableDeclarator": {
                            if (adone.meta.code.is.arrowFunction(xObj)) {
                                xObj.name = node.id.name;
                            }
                            this._exports[node.id.name] = xObj;
                            break;
                        }
                        case "Identifier": {
                            this._exports[isDefault ? "default" : node.name] = xObj;
                            break;
                        }
                    }
                }

                path.skip();
            }
        });

        if (lazies.length > 0) {
            this._lazyModules = new Map();
            for (const { name, path } of lazies) {
                const filePath = await fs.lookup(path);
                const lazyModule = new adone.meta.code.Module({ nsName: this.nsName, filePath });
                await lazyModule.load();
                this._lazyModules.set(name, lazyModule);
            }
        }
        // adone.log(Object.keys(this.exports()));
    }
}
