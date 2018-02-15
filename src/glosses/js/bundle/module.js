import MagicString from "magic-string";
import { locate } from "locate-character";
import { timeStart, timeEnd } from "./utils/flushTime";
import { blank } from "./utils/object";
import { basename, extname } from "./utils/path";
import { makeLegal } from "./utils/identifierHelpers";
import getCodeFrame from "./utils/getCodeFrame";
import { SOURCEMAPPING_URL_RE } from "./utils/sourceMappingURL";
import error from "./utils/error";
import NamespaceVariable from "./ast/variables/NamespaceVariable";
import extractNames from "./ast/utils/extractNames";
import enhance from "./ast/enhance";
import clone from "./ast/clone";
import ModuleScope from "./ast/scopes/ModuleScope";
import { encode } from "sourcemap-codec";
import { SourceMapConsumer } from "source-map";
import { isTemplateLiteral } from "./ast/nodes/TemplateLiteral";
import { isLiteral } from "./ast/nodes/Literal";

const {
    is
} = adone;

const includeFully = function (node) {
    node.included = true;
    if (node.variable && !node.variable.included) {
        node.variable.includeVariable();
    }
    node.eachChild(includeFully);
};
export const NO_SEMICOLON = { isNoStatement: true };
export default class Module {
    constructor(graph, id) {
        this.id = id;
        this.graph = graph;
        this.comments = [];
        if (graph.dynamicImport) {
            this.dynamicImports = [];
            this.dynamicImportResolutions = [];
        }
        this.isEntryPoint = false;
        this.execIndex = null;
        this.entryPointsHash = new Uint8Array(10);
        this.excludeFromSourcemap = /\0/.test(id);
        this.context = graph.getModuleContext(id);
        // all dependencies
        this.sources = [];
        this.dependencies = [];
        // imports and exports, indexed by local name
        this.imports = blank();
        this.exports = blank();
        this.exportsAll = blank();
        this.reexports = blank();
        this.exportAllSources = [];
        this.exportAllModules = null;
        this.declarations = blank();
        this.scope = new ModuleScope(this);
    }

    setSource({ code, originalCode, originalSourcemap, ast, sourcemapChain, resolvedIds }) {
        this.code = code;
        this.originalCode = originalCode;
        this.originalSourcemap = originalSourcemap;
        this.sourcemapChain = sourcemapChain;
        timeStart("ast");
        if (ast) {
            // prevent mutating the provided AST, as it may be reused on
            // subsequent incremental rebuilds
            this.ast = clone(ast);
            this.astClone = ast;
        } else {
            // TODO what happens to comments if AST is provided?
            try {
                const result = adone.js.compiler.parse(this.code, {
                    sourceType: "module",
                    plugins: [
                        "dynamicImport",
                        "objectRestSpread",
                        "decorators"
                    ]
                });
                this.ast = result.program;
                this.comments = result.comments.map((comment) => ({
                    start: comment.start,
                    end: comment.end,
                    text: comment.value,
                    block: comment.type === "CommentBlock"
                }));
            } catch (err) {
                this.error({
                    code: "PARSE_ERROR",
                    message: err.message.replace(/ \(\d+:\d+\)$/, "")
                }, err.pos);
            }

            this.astClone = clone(this.ast);
        }
        timeEnd("ast");
        this.resolvedIds = resolvedIds || blank();
        // By default, `id` is the filename. Custom resolvers and loaders
        // can change that, but it makes sense to use it for the source filename
        this.magicString = new MagicString(code, {
            filename: this.excludeFromSourcemap ? null : this.id,
            indentExclusionRanges: []
        });
        this.removeExistingSourceMap();
        timeStart("analyse");
        this.analyse();
        timeEnd("analyse");
    }

    removeExistingSourceMap() {
        this.comments.forEach((comment) => {
            if (!comment.block && SOURCEMAPPING_URL_RE.test(comment.text)) {
                this.magicString.remove(comment.start, comment.end);
            }
        });
    }

    addExport(node) {
        const source = node.source && node.source.value;
        // export { name } from './other'
        if (source) {
            if (!this.sources.includes(source)) {
                this.sources.push(source);
            }
            if (node.type === "ExportAllDeclaration" /* ExportAllDeclaration */) {
                // Store `export * from '...'` statements in an array of delegates.
                // When an unknown import is encountered, we see if one of them can satisfy it.
                this.exportAllSources.push(source);
            } else {
                node.specifiers.forEach((specifier) => {
                    const name = specifier.exported.name;
                    if (this.exports[name] || this.reexports[name]) {
                        this.error({
                            code: "DUPLICATE_EXPORT",
                            message: `A module cannot have multiple exports with the same name ('${name}')`
                        }, specifier.start);
                    }
                    this.reexports[name] = {
                        start: specifier.start,
                        source,
                        localName: specifier.local.name,
                        module: null // filled in later
                    };
                });
            }
        } else if (node.type === "ExportDefaultDeclaration" /* ExportDefaultDeclaration */) {
            // export default function foo () {}
            // export default foo;
            // export default 42;
            const identifier = (node.declaration.id
                && node.declaration.id.name)
                || node.declaration.name;
            if (this.exports.default) {
                this.error({
                    code: "DUPLICATE_EXPORT",
                    message: "A module can only have one default export"
                }, node.start);
            }
            this.exports.default = {
                localName: "default",
                identifier
            };
        } else if (node.declaration) {
            // export var { foo, bar } = ...
            // export var foo = 42;
            // export var a = 1, b = 2, c = 3;
            // export function foo () {}
            const declaration = node.declaration;
            if (declaration.type === "VariableDeclaration" /* VariableDeclaration */) {
                declaration.declarations.forEach((decl) => {
                    extractNames(decl.id).forEach((localName) => {
                        this.exports[localName] = { localName };
                    });
                });
            } else {
                // export function foo () {}
                const localName = declaration.id.name;
                this.exports[localName] = { localName };
            }
        } else {
            // export { foo, bar, baz }
            node.specifiers.forEach((specifier) => {
                const localName = specifier.local.name;
                const exportedName = specifier.exported.name;
                if (this.exports[exportedName] || this.reexports[exportedName]) {
                    this.error({
                        code: "DUPLICATE_EXPORT",
                        message: `A module cannot have multiple exports with the same name ('${exportedName}')`
                    }, specifier.start);
                }
                this.exports[exportedName] = { localName };
            });
        }
    }

    addImport(node) {
        const source = node.source.value;
        if (!this.sources.includes(source)) {
            this.sources.push(source);
        }
        node.specifiers.forEach((specifier) => {
            const localName = specifier.local.name;
            if (this.imports[localName]) {
                this.error({
                    code: "DUPLICATE_IMPORT",
                    message: `Duplicated import '${localName}'`
                }, specifier.start);
            }
            const isDefault = specifier.type === "ImportDefaultSpecifier";
            const isNamespace = specifier.type === "ImportNamespaceSpecifier";
            const name = isDefault
                ? "default"
                : isNamespace ? "*" : specifier.imported.name;
            // adone.trace(isDefault, isNamespace, name, source);
            // adone.trace(adone.util.omit(specifier, ["module", "loc", "scope", "parent"]));
            this.imports[localName] = { source, specifier, name, module: null };
        });
    }

    analyse() {
        enhance(this.ast, this, this.comments, this.dynamicImports);
        this.ast.body.forEach((node) => {
            if (node.isImportDeclaration) {
                this.addImport(node);
            } else if (node.isExportDeclaration) {
                this.addExport(node);
            }
        });
    }

    basename() {
        const base = basename(this.id);
        const ext = extname(this.id);
        return makeLegal(ext ? base.slice(0, -ext.length) : base);
    }

    markExports() {
        this.getExports().forEach((name) => {
            const variable = this.traceExport(name);
            variable.exportName = name;
            variable.includeVariable();
            if (variable.isNamespace) {
                variable.needsNamespaceBlock = true;
            }
        });
        this.getReexports().forEach((name) => {
            const variable = this.traceExport(name);
            variable.exportName = name;
            if (variable.isExternal) {
                variable.reexported = variable.module.reexported = true;
            } else {
                variable.includeVariable();
            }
        });
    }

    linkDependencies() {
        this.sources.forEach((source) => {
            const id = this.resolvedIds[source];
            if (id) {
                const module = this.graph.moduleById.get(id);
                this.dependencies.push(module);
            }
        });
        [this.imports, this.reexports].forEach((specifiers) => {
            Object.keys(specifiers).forEach((name) => {
                const specifier = specifiers[name];
                const id = this.resolvedIds[specifier.source];
                specifier.module = this.graph.moduleById.get(id);
            });
        });
        this.exportAllModules = this.exportAllSources.map((source) => {
            const id = this.resolvedIds[source];
            return this.graph.moduleById.get(id);
        });
    }

    bindReferences() {
        this.ast.body.forEach((node) => node.bind());
    }

    getDynamicImportExpressions() {
        return this.dynamicImports.map((node) => {
            const importArgument = node.parent.arguments[0];
            if (isTemplateLiteral(importArgument)) {
                if (importArgument.expressions.length === 0 && importArgument.quasis.length === 1) {
                    return importArgument.quasis[0].value.cooked;
                }
            } else if (isLiteral(importArgument)) {
                if (is.string((importArgument).value)) {
                    return importArgument.value;
                }
            } else {
                return importArgument;
            }
        });
    }

    getOriginalLocation(sourcemapChain, line, column) {
        let location = {
            line,
            column
        };
        const filteredSourcemapChain = sourcemapChain
            .filter((sourcemap) => sourcemap.mappings)
            .map((sourcemap) => {
                const encodedSourcemap = sourcemap;
                if (sourcemap.mappings) {
                    encodedSourcemap.mappings = encode(encodedSourcemap.mappings);
                }
                return encodedSourcemap;
            });
        while (filteredSourcemapChain.length > 0) {
            const sourcemap = filteredSourcemapChain.pop();
            const smc = new SourceMapConsumer(sourcemap);
            location = smc.originalPositionFor({
                line: location.line,
                column: location.column
            });
        }
        return location;
    }

    error(props, pos) {
        if (!is.undefined(pos)) {
            props.pos = pos;
            const { line, column } = locate(this.code, pos, { offsetLine: 1 });
            const location = this.getOriginalLocation(this.sourcemapChain, line, column);
            props.loc = {
                file: this.id,
                line: location.line,
                column: location.column
            };
            props.frame = getCodeFrame(this.originalCode, location.line, location.column);
        }
        error(props);
    }

    getAllExports() {
        const allExports = Object.assign(blank(), this.exports, this.reexports);
        this.exportAllModules.forEach((module) => {
            if (module.isExternal) {
                allExports[`*${module.id}`] = true;
                return;
            }
            module
                .getAllExports()
                .forEach((name) => {
                    if (name !== "default") {
                        allExports[name] = true;
                    }
                });
        });
        return Object.keys(allExports);
    }

    getExports() {
        return Object.keys(this.exports);
    }

    getReexports() {
        const reexports = blank();
        Object.keys(this.reexports).forEach((name) => {
            reexports[name] = true;
        });
        this.exportAllModules.forEach((module) => {
            if (module.isExternal) {
                reexports[`*${module.id}`] = true;
                return;
            }
            module
                .getExports()
                .concat(module.getReexports())
                .forEach((name) => {
                    if (name !== "default") {
                        reexports[name] = true;
                    }
                });
        });
        return Object.keys(reexports);
    }

    includeAllInBundle() {
        this.ast.body.forEach(includeFully);
    }

    includeInBundle() {
        let addedNewNodes = false;
        this.ast.body.forEach((node) => {
            if (node.shouldBeIncluded()) {
                if (node.includeInBundle()) {
                    addedNewNodes = true;
                }
            }
        });
        return addedNewNodes;
    }

    namespace() {
        if (!this.declarations["*"]) {
            this.declarations["*"] = new NamespaceVariable(this);
        }
        return this.declarations["*"];
    }

    render(options) {
        const magicString = this.magicString.clone();
        this.ast.render(magicString, options);
        if (this.namespace().needsNamespaceBlock) {
            magicString.append(`\n\n${this.namespace().renderBlock(options.legacy, options.freeze, "\t")}`); // TODO use correct indentation
        }
        // TODO TypeScript: It seems magicString is missing type information here
        return magicString.trim();
    }

    toJSON() {
        return {
            id: this.id,
            dependencies: this.dependencies.map((module) => module.id),
            code: this.code,
            originalCode: this.originalCode,
            originalSourcemap: this.originalSourcemap,
            ast: this.astClone,
            sourcemapChain: this.sourcemapChain,
            resolvedIds: this.resolvedIds
        };
    }

    trace(name) {
        // TODO this is slightly circular
        if (name in this.scope.variables) {
            return this.scope.variables[name];
        }
        if (name in this.imports) {
            const importDeclaration = this.imports[name];
            const otherModule = importDeclaration.module;
            if (!otherModule.isExternal && importDeclaration.name === "*") {
                return otherModule.namespace();
            }
            const declaration = otherModule.traceExport(importDeclaration.name);
            if (!declaration) {
                this.graph.handleMissingExport(this, importDeclaration.name, otherModule, importDeclaration.specifier.start);
            }
            return declaration;
        }
        return null;
    }

    traceExport(name) {
        if (name[0] === "*") {
            // namespace
            if (name.length === 1) {
                return this.namespace();
                // export * from 'external'
            }

            const module = this.graph.moduleById.get(name.slice(1));
            return module.traceExport("*");

        }
        // export { foo } from './other'
        const reexportDeclaration = this.reexports[name];
        if (reexportDeclaration) {
            const declaration = reexportDeclaration.module.traceExport(reexportDeclaration.localName);
            if (!declaration) {
                this.graph.handleMissingExport(this, reexportDeclaration.localName, reexportDeclaration.module, reexportDeclaration.start);
            }
            return declaration;
        }
        const exportDeclaration = this.exports[name];
        if (exportDeclaration) {
            const name = exportDeclaration.localName;
            const declaration = this.trace(name);
            return declaration || this.graph.scope.findVariable(name);
        }
        if (name === "default") {
            return;
        }
        for (let i = 0; i < this.exportAllModules.length; i += 1) {
            const module = this.exportAllModules[i];
            const declaration = module.traceExport(name);
            if (declaration) {
                return declaration;
            }
        }
    }

    warn(warning, pos) {
        if (!is.undefined(pos)) {
            warning.pos = pos;
            const { line, column } = locate(this.code, pos, { offsetLine: 1 }); // TODO trace sourcemaps, cf. error()
            warning.loc = { file: this.id, line, column };
            warning.frame = getCodeFrame(this.code, line, column);
        }
        warning.id = this.id;
        this.graph.warn(warning);
    }
}
