import { timeStart, timeEnd } from "./utils/flushTime";
import { decode } from "sourcemap-codec";
import { Bundle as MagicStringBundle } from "magic-string";
import { blank, forOwn } from "./utils/object";
import Module from "./module";
import finalisers from "./finalisers/index";
import getExportMode from "./utils/getExportMode";
import getIndentString from "./utils/getIndentString";
import { runSequence } from "./utils/promise";
import transformBundle from "./utils/transformBundle";
import collapseSourcemaps from "./utils/collapseSourcemaps";
import callIfFunction from "./utils/callIfFunction";
import error from "./utils/error";
import { normalize, resolve } from "./utils/path";
import ExternalModule from "./external_module";
import { makeLegal } from "./utils/identifierHelpers";
import LocalVariable from "./ast/variables/LocalVariable";

const {
    is
} = adone;

export default class Chunk {
    constructor(graph, orderedModules) {
        this.graph = graph;
        this.orderedModules = orderedModules;
        this.exportedVariables = new Map();
        this.imports = [];
        this.exports = {};
        this.externalModules = undefined;
        this.dependencies = undefined;
        this.entryModule = undefined;
        this.isEntryModuleFacade = false;
        orderedModules.forEach((module) => {
            if (module.isEntryPoint) {
                if (!this.entryModule) {
                    this.entryModule = module;
                    this.isEntryModuleFacade = true;
                } else {
                    this.isEntryModuleFacade = false;
                }
            }
            module.chunk = this;
        });
    }

    setId(id) {
        this.id = id;
        this.name = makeLegal(id);
    }

    // ensure that the module exports or reexports the given variable
    // we don't replace reexports with the direct reexport from the final module
    // as this might result in exposing an internal module which taints an entryModule chunk
    ensureExport(module, variable) {
        let safeExportName = this.exportedVariables.get(variable);
        if (safeExportName) {
            return safeExportName;
        }
        let i = 0;
        if (variable.exportName) {
            safeExportName = variable.exportName;
        } else {
            safeExportName = variable.exportName = variable.name;
        }
        while (this.exports[safeExportName]) {
            safeExportName = `${variable.exportName || variable.name}$${++i}`;
        }
        variable.exportName = safeExportName;
        const curExport = this.exports[safeExportName] = { module, name: undefined, variable };
        this.exportedVariables.set(variable, safeExportName);
        // if we've just exposed an export of a non-entry-point,
        // then note we are no longer an entry point chunk
        // we will then need an entry point facade if this is an entry point module
        if (this.isEntryModuleFacade && module.chunk === this && !module.isEntryPoint) {
            this.isEntryModuleFacade = false;
        }
        // if we are reexporting a module in another chunk
        // then we also have to ensure it is an export there too
        // and note the name it comes from
        if (module.chunk !== this && !module.isExternal) {
            curExport.name = module.chunk.ensureExport(module, variable);
        } else {
            curExport.name = safeExportName;
        }
        return safeExportName;
    }

    generateEntryExports(entryModule) {
        entryModule.getAllExports().forEach((exportName) => {
            const traced = this.traceExport(entryModule, exportName);
            const variable = traced.module.traceExport(traced.name);
            this.exports[exportName] = { module: traced.module, name: traced.name, variable };
            // if we exposed an export in another module ensure it is exported there
            if (traced.module.chunk !== this && !traced.module.isExternal) {
                traced.module.chunk.ensureExport(traced.module, variable);
            }
            this.exportedVariables.set(variable, exportName);
        });
    }

    collectDependencies(entryFacade) {
        if (entryFacade) {
            this.externalModules = [];
            this.dependencies = [entryFacade.chunk];
            return;
        }
        this.externalModules = [];
        this.dependencies = [];
        this.orderedModules.forEach((module) => {
            module.dependencies.forEach((dep) => {
                if (dep.chunk === this) {
                    return;
                }
                let depModule;
                if (dep instanceof Module) {
                    depModule = dep.chunk;
                } else {
                    // unused pure external modules can be skipped
                    if (!dep.used && this.graph.isPureExternalModule(dep.id)) {
                        return;
                    }
                    depModule = dep;
                }
                if (!this.dependencies.some((dep) => dep === depModule)) {
                    this.dependencies.push(depModule);
                    if (dep.isExternal) {
                        this.externalModules.push(dep);
                    }
                }
            });
        });
        Object.keys(this.exports).forEach((exportName) => {
            const expt = this.exports[exportName];
            if (expt.module instanceof ExternalModule) {
                if (!this.dependencies.some((dep) => dep === expt.module)) {
                    this.dependencies.push(expt.module);
                    this.externalModules.push(expt.module);
                }
            } else if (expt.module.chunk !== this) {
                if (!this.dependencies.some((dep) => dep === expt.module.chunk)) {
                    this.dependencies.push(expt.module.chunk);
                }
            }
        });
    }

    generateImports() {
        this.orderedModules.forEach((module) => {
            Object.keys(module.imports).forEach((importName) => {
                const declaration = module.imports[importName];
                this.traceImport(declaration.module, declaration.name);
            });
        });
    }

    populateImport(variable, tracedExport) {
        if (!variable.included) {
            return;
        }
        let exportName, importModule;
        // ensure that the variable is exported by the other chunk to this one
        if (tracedExport.module instanceof Module) {
            importModule = tracedExport.module.chunk;
            exportName = tracedExport.module.chunk.ensureExport(tracedExport.module, variable);
        } else {
            importModule = tracedExport.module;
            exportName = variable.name;
        }
        let impt = this.imports.find((impt) => impt.module === importModule);
        if (!impt) {
            this.imports.push(impt = { module: importModule, variables: [] });
        }
        // if we already import this variable skip
        if (impt.variables.some((v) => v.module === tracedExport.module && v.variable === variable)) {
            return;
        }
        impt.variables.push({
            module: tracedExport.module,
            variable,
            name: exportName[0] === "*" ? "*" : exportName
        });
    }

    getImportIds() {
        return this.imports.map((impt) => impt.module.id);
    }

    getExportNames() {
        return Object.keys(this.exports);
    }

    getJsonModules() {
        return this.orderedModules.map((module) => module.toJSON());
    }

    traceImport(module, exportName) {
        const tracedExport = this.traceExport(module, exportName);
        // ignore imports to modules already in this chunk
        if (!tracedExport || tracedExport.module.chunk === this) {
            return tracedExport;
        }
        const variable = tracedExport.module.traceExport(tracedExport.name);
        // namespace variable can indicate multiple imports
        if (tracedExport.name === "*") {
            Object.keys(variable.originals || variable.module.declarations).forEach((importName) => {
                const original = (variable.originals || variable.module.declarations)[importName];
                this.populateImport(original, tracedExport);
            });
            return tracedExport;
        }
        this.populateImport(variable, tracedExport);
        return tracedExport;
    }

    // trace a module export to its exposed chunk module export
    // either in this chunk or in another
    // we follow reexports if they are not entry points in the hope
    // that we can get an entry point reexport to reduce the chance of
    // tainting an entryModule chunk by exposing other unnecessary exports
    traceExport(module, name) {
        if (name === "*") {
            return { name, module };
        }
        if (module instanceof ExternalModule) {
            return { name, module };
        }
        if (module.chunk !== this && module.isEntryPoint) {
            return { name, module };
        }
        const exportDeclaration = module.exports[name];
        if (exportDeclaration) {
            // if export binding is itself an import binding then continue tracing
            const importDeclaration = module.imports[exportDeclaration.localName];
            if (importDeclaration) {
                return this.traceImport(importDeclaration.module, importDeclaration.name);
            }
            return { name, module };
        }
        const reexportDeclaration = module.reexports[name];
        if (reexportDeclaration) {
            return this.traceExport(reexportDeclaration.module, reexportDeclaration.localName);
        }
        if (name === "default") {
            return;
        }
        // external star exports
        if (name[0] === "*") {
            return { name: "*", module: this.graph.moduleById.get(name.substr(1)) };
        }
        // resolve known star exports
        for (let i = 0; i < module.exportAllModules.length; i++) {
            const exportAllModule = module.exportAllModules[i];
            // we have to ensure the right export all module
            if (exportAllModule.traceExport(name)) {
                return this.traceExport(exportAllModule, name);
            }
        }
    }

    collectAddon(initialAddon, addonName, sep = "\n") {
        return runSequence([{ pluginName: "rollup", source: initialAddon }]
            .concat(this.graph.plugins.map((plugin, idx) => {
                return {
                    pluginName: plugin.name || `Plugin at pos ${idx}`,
                    source: plugin[addonName]
                };
            }))
            .map((addon) => {
                addon.source = callIfFunction(addon.source);
                return addon;
            })
            .filter((addon) => {
                return addon.source;
            })
            .map(({ pluginName, source }) => {
                return Promise.resolve(source).catch((err) => {
                    error({
                        code: "ADDON_ERROR",
                        message: `Could not retrieve ${addonName}. Check configuration of ${pluginName}.
	Error Message: ${err.message}`
                    });
                });
            })).then((addons) => addons.filter(Boolean).join(sep));
    }

    setDynamicImportResolutions({ format }) {
        const es = format === "es";
        let dynamicImportMechanism;
        if (!es) {
            if (format === "cjs") {
                dynamicImportMechanism = {
                    left: "Promise.resolve(require(",
                    right: "))",
                    interopLeft: "Promise.resolve({ default: require(",
                    interopRight: ") })"
                };
            } else if (format === "amd") {
                dynamicImportMechanism = {
                    left: "new Promise(function (resolve, reject) { require([",
                    right: "], resolve, reject) })",
                    interopLeft: "new Promise(function (resolve, reject) { require([",
                    interopRight: "], function (m) { resolve({ default: m }) }, reject) })"
                };
            } else if (format === "system") {
                dynamicImportMechanism = {
                    left: "module.import(",
                    right: ")"
                };
            }
        }
        this.orderedModules.forEach((module) => {
            module.dynamicImportResolutions.forEach((replacement, index) => {
                const node = module.dynamicImports[index];
                if (!replacement) {
                    return;
                }
                if (replacement instanceof Module) {
                    // if we have the module in the chunk, inline as Promise.resolve(namespace)
                    // ensuring that we create a namespace import of it as well
                    if (replacement.chunk === this) {
                        node.setResolution(replacement.namespace(), false);
                        // for the module in another chunk, import that other chunk directly
                    } else {
                        node.setResolution(`"${replacement.chunk.id}"`, false);
                    }
                    // external dynamic import resolution
                } else if (replacement instanceof ExternalModule) {
                    node.setResolution(`"${replacement.id}"`, true);
                    // AST Node -> source replacement
                } else {
                    node.setResolution(replacement, false);
                }
            });
        });
        return dynamicImportMechanism;
    }

    setIdentifierRenderResolutions(options) {
        const used = blank();
        const es = options.format === "es";
        const system = options.format === "system";
        // ensure no conflicts with globals
        Object.keys(this.graph.scope.variables).forEach((name) => (used[name] = 1));
        const getSafeName = function (name) {
            let safeName = name;
            while (used[safeName]) {
                safeName = `${name}$${used[name]++}`;
            }
            used[safeName] = 1;
            return safeName;
        };
        // reserved internal binding names for system format wiring
        if (system) {
            used._setter = used._starExcludes = used._$p = 1;
        }
        const toDeshadow = new Set();
        if (!es) {
            this.externalModules.forEach((module) => {
                const safeName = getSafeName(module.name);
                toDeshadow.add(safeName);
                module.name = safeName;
            });
        }
        this.imports.forEach((impt) => {
            impt.variables.forEach(({ name, module, variable }) => {
                let safeName;
                if (module.isExternal) {
                    if (variable.name === "*") {
                        safeName = module.name;
                    } else if (variable.name === "default") {
                        if (module.exportsNamespace || !es && module.exportsNames) {
                            safeName = `${module.name}__default`;
                        } else {
                            safeName = module.name;
                        }
                    } else {
                        safeName = (es || system) ? variable.name : `${module.name}.${name}`;
                    }
                    if (es || system) {
                        safeName = getSafeName(safeName);
                        toDeshadow.add(safeName);
                    }
                } else if (es || system) {
                    safeName = getSafeName(variable.name);
                } else {
                    safeName = `${module.chunk.name}.${name}`;
                }
                variable.setSafeName(safeName);
            });
        });
        this.orderedModules.forEach((module) => {
            forOwn(module.scope.variables, (variable) => {
                if (!variable.isDefault || !variable.hasId) {
                    let safeName;
                    if (es || system || !variable.isReassigned || variable.isId) {
                        safeName = getSafeName(variable.name);
                    } else {
                        const safeExportName = this.exportedVariables.get(variable);
                        if (safeExportName) {
                            safeName = `exports.${safeExportName}`;
                        } else {
                            safeName = getSafeName(variable.name);
                        }
                    }
                    variable.setSafeName(safeName);
                }
            });
            // deconflict reified namespaces
            const namespace = module.namespace();
            if (namespace.needsNamespaceBlock) {
                namespace.name = getSafeName(namespace.name);
            }
        });
        this.graph.scope.deshadow(toDeshadow, this.orderedModules.map((module) => module.scope));
    }

    getModuleDeclarations() {
        const reexportDeclarations = {};
        for (const name in this.exports) {
            const expt = this.exports[name];
            // skip local exports
            if (expt.module.chunk === this) {
                continue;
            }
            let depId;
            if (expt.module.isExternal) {
                depId = expt.module.id;
            } else {
                depId = expt.module.chunk.id;
            }
            const exportDeclaration = reexportDeclarations[depId] = reexportDeclarations[depId] || [];
            exportDeclaration.push({
                imported: expt.name,
                reexported: name[0] === "*" ? "*" : name
            });
        }
        const dependencies = [];
        this.dependencies.forEach((dep) => {
            const importSpecifiers = this.imports.find((impt) => impt.module === dep);
            let imports;
            if (importSpecifiers && importSpecifiers.variables.length) {
                imports = [];
                for (let i = 0; i < importSpecifiers.variables.length; i++) {
                    const impt = importSpecifiers.variables[i];
                    imports.push({
                        local: impt.variable.getName(),
                        imported: impt.name
                    });
                }
            }
            const reexports = reexportDeclarations[dep.id];
            dependencies.push({
                id: dep.id,
                name: dep.name,
                isChunk: !dep.isExternal,
                reexports,
                imports
            });
        });
        const exports = [];
        for (const name in this.exports) {
            const expt = this.exports[name];
            // skip external exports
            if (expt.module.chunk !== this) {
                continue;
            }
            // determine if a hoisted export (function)
            let hoisted = false;
            if (expt.variable instanceof LocalVariable) {
                expt.variable.declarations.forEach((decl) => {
                    if (decl.type === "ExportDefaultDeclaration" /* ExportDefaultDeclaration */) {
                        if (decl.declaration.type === "FunctionDeclaration" /**
                                                                             * FunctionDeclaration
                                                                             */) {
                            hoisted = true;
                        }
                    } else if (decl.parent.type === "FunctionDeclaration" /* FunctionDeclaration */) {
                        hoisted = true;
                    }
                });
            }
            exports.push({
                local: expt.variable.getName(),
                exported: name,
                hoisted
            });
        }
        return { dependencies, exports };
    }

    render(options) {
        return Promise.resolve()
            .then(() => {
                return Promise.all([
                    this.collectAddon(options.banner, "banner"),
                    this.collectAddon(options.footer, "footer"),
                    this.collectAddon(options.intro, "intro", "\n\n"),
                    this.collectAddon(options.outro, "outro", "\n\n")
                ]);
            })
            .then(([banner, footer, intro, outro]) => {
                // Determine export mode - 'default', 'named', 'none'
                const exportMode = getExportMode(this, options);
                let magicString = new MagicStringBundle({ separator: "\n\n" });
                const usedModules = [];
                timeStart("render modules");
                const renderOptions = {
                    legacy: this.graph.legacy,
                    freeze: options.freeze !== false,
                    systemBindings: options.format === "system",
                    importMechanism: this.graph.dynamicImport && this.setDynamicImportResolutions(options)
                };
                this.setIdentifierRenderResolutions(options);
                this.orderedModules.forEach((module) => {
                    const source = module.render(renderOptions);
                    if (source.toString().length) {
                        magicString.addSource(source);
                        usedModules.push(module);
                    }
                });
                if (!magicString.toString().trim() && this.getExportNames().length === 0) {
                    this.graph.warn({
                        code: "EMPTY_BUNDLE",
                        message: "Generated an empty bundle"
                    });
                }
                timeEnd("render modules");
                const indentString = getIndentString(magicString, options);
                const finalise = finalisers[options.format];
                if (!finalise) {
                    error({
                        code: "INVALID_OPTION",
                        message: `Invalid format: ${options.format} - valid options are ${Object.keys(finalisers).join(", ")}`
                    });
                }
                timeStart("render format");
                const getPath = this.createGetPath(options);
                if (intro) {
                    intro += "\n\n";
                }
                if (outro) {
                    outro = `\n\n${outro}`;
                }
                magicString = finalise(this, magicString.trim(), // TODO TypeScript: Awaiting MagicString PR
                    { exportMode, getPath, indentString, intro, outro }, options);
                timeEnd("render format");
                if (banner) {
                    magicString.prepend(`${banner}\n`);
                }
                if (footer) {
                    magicString.append(`\n${footer}`);
                } // TODO TypeScript: Awaiting MagicString PR
                const prevCode = magicString.toString();
                let map = null;
                const bundleSourcemapChain = [];
                return transformBundle(prevCode, this.graph.plugins, bundleSourcemapChain, options).then((code) => {
                    if (options.sourcemap) {
                        timeStart("sourcemap");
                        let file = options.file ? options.sourcemapFile || options.file : this.id;
                        if (file) {
                            file = resolve(!is.undefined(process) ? process.cwd() : "", file);
                        }
                        if (this.graph.hasLoaders ||
                            this.graph.plugins.find((plugin) => Boolean(plugin.transform || plugin.transformBundle))) {
                            map = magicString.generateMap({}); // TODO TypeScript: Awaiting missing version in SourceMap type
                            if (is.string(map.mappings)) {
                                map.mappings = decode(map.mappings);
                            }
                            map = collapseSourcemaps(this, file, map, usedModules, bundleSourcemapChain);
                        } else {
                            map = magicString.generateMap({ file, includeContent: true }); // TODO TypeScript: Awaiting missing version in SourceMap type
                        }
                        map.sources = map.sources.map(normalize);
                        timeEnd("sourcemap");
                    }
                    if (code[code.length - 1] !== "\n") {
                        code += "\n";
                    }
                    return { code, map }; // TODO TypeScript: Awaiting missing version in SourceMap type
                });
            });
    }

    createGetPath(options) {
        const optionsPaths = options.paths;
        const getPath = is.function(optionsPaths)
            ? (id) => optionsPaths(id, this.id) || this.graph.getPathRelativeToBaseDirname(id, this.id)
            : optionsPaths
                ? (id) => optionsPaths.hasOwnProperty(id)
                    ? optionsPaths[id]
                    : this.graph.getPathRelativeToBaseDirname(id, this.id)
                : (id) => this.graph.getPathRelativeToBaseDirname(id, this.id);
        return getPath;
    }
}
