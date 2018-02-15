import { timeEnd, timeStart } from "./utils/flushTime";
import first from "./utils/first";
import Module from "./module";
import ExternalModule from "./external_module";
import ensureArray from "./utils/ensureArray";
import { load, makeOnwarn, resolveId, handleMissingExport } from "./utils/defaults";
import { mapSequence } from "./utils/promise";
import transform from "./utils/transform";
import relativeId from "./utils/relativeId";
import error from "./utils/error";
import { isAbsolute, isRelative, normalize, relative, resolve } from "./utils/path";
import Chunk from "./chunk";
import * as path from "./utils/path";
import GlobalScope from "./ast/scopes/GlobalScope";
import { randomUint8Array, Uint8ArrayXor, Uint8ArrayToHexString } from "./utils/entryHashing";
import { blank } from "./utils/object";
import firstSync from "./utils/first-sync";

const {
    is
} = adone;

const generateChunkName = function (id, chunkNames, startAtTwo = false) {
    let name = path.basename(id);
    let ext = path.extname(name);
    name = name.substr(0, name.length - ext.length);
    if (ext !== ".js" && ext !== ".mjs") {
        name += ext;
        ext = ".js";
    }
    let uniqueName = name;
    let uniqueIndex = startAtTwo ? 2 : 1;
    while (chunkNames[uniqueName]) {
        uniqueName = name + uniqueIndex++;
    }
    chunkNames[uniqueName] = true;
    return uniqueName + ext;
};

export default class Graph {
    constructor(options) {
        this.cachedModules = new Map();
        if (options.cache) {
            options.cache.modules.forEach((module) => {
                this.cachedModules.set(module.id, module);
            });
        }
        delete options.cache; // TODO not deleting it here causes a memory leak; needs further investigation
        this.plugins = ensureArray(options.plugins);
        options = this.plugins.reduce((acc, plugin) => {
            if (plugin.options) {
                return plugin.options(acc) || acc;
            }
            return acc;
        }, options);
        if (!options.input) {
            throw new Error("You must supply options.input to rollup");
        }
        this.treeshake = options.treeshake !== false;
        if (this.treeshake) {
            this.treeshakingOptions = {
                propertyReadSideEffects: options.treeshake
                    ? options.treeshake.propertyReadSideEffects !== false
                    : true,
                pureExternalModules: options.treeshake
                    ? options.treeshake.pureExternalModules
                    : false
            };
            if (this.treeshakingOptions.pureExternalModules === true) {
                this.isPureExternalModule = () => true;
            } else if (is.function(this.treeshakingOptions.pureExternalModules)) {
                this.isPureExternalModule = this.treeshakingOptions.pureExternalModules;
            } else if (is.array(this.treeshakingOptions.pureExternalModules)) {
                const pureExternalModules = new Set(this.treeshakingOptions.pureExternalModules);
                this.isPureExternalModule = (id) => pureExternalModules.has(id);
            } else {
                this.isPureExternalModule = () => false;
            }
        } else {
            this.isPureExternalModule = () => false;
        }
        this.resolveId = first([((id, parentId) => (this.isExternal(id, parentId, false) ? false : null))]
            .concat(this.plugins.map((plugin) => plugin.resolveId).filter(Boolean))
            .concat(resolveId(options)));
        const loaders = this.plugins.map((plugin) => plugin.load).filter(Boolean);
        this.hasLoaders = loaders.length !== 0;
        this.load = first(loaders.concat(load));
        this.handleMissingExport = firstSync(this.plugins.map((plugin) => plugin.missingExport).filter(Boolean)
            .concat(handleMissingExport));
        this.scope = new GlobalScope();
        // TODO strictly speaking, this only applies with non-ES6, non-default-only bundles
        ["module", "exports", "_interopDefault"].forEach((name) => {
            this.scope.findVariable(name); // creates global variable as side-effect
        });
        this.moduleById = new Map();
        this.modules = [];
        this.externalModules = [];
        this.context = String(options.context);
        const optionsModuleContext = options.moduleContext;
        if (is.function(optionsModuleContext)) {
            this.getModuleContext = (id) => optionsModuleContext(id) || this.context;
        } else if (typeof optionsModuleContext === "object") {
            const moduleContext = new Map();
            Object.keys(optionsModuleContext).forEach((key) => moduleContext.set(resolve(key), optionsModuleContext[key]));
            this.getModuleContext = (id) => moduleContext.get(id) || this.context;
        } else {
            this.getModuleContext = () => this.context;
        }
        if (is.function(options.external)) {
            this.isExternal = options.external;
        } else {
            const ids = ensureArray(options.external);
            this.isExternal = (id) => ids.indexOf(id) !== -1;
        }
        this.onwarn = options.onwarn || makeOnwarn();
        this.varOrConst = options.preferConst ? "const" : "var";
        this.legacy = options.legacy;
        this.dynamicImport = is.boolean(options.experimentalDynamicImport) ? options.experimentalDynamicImport : false;
        if (this.dynamicImport) {
            this.resolveDynamicImport = first([
                ...this.plugins.map((plugin) => plugin.resolveDynamicImport).filter(Boolean),
                ((specifier, parentId) => is.string(specifier) && this.resolveId(specifier, parentId))
            ]);
        }
    }

    getPathRelativeToBaseDirname(resolvedId, parentId) {
        if (isRelative(resolvedId) || isAbsolute(resolvedId)) {
            const relativeToEntry = normalize(relative(path.dirname(parentId), resolvedId));
            return isRelative(relativeToEntry)
                ? relativeToEntry
                : `./${relativeToEntry}`;
        }
        return resolvedId;
    }

    async loadModule(entryName) {
        const id = await this.resolveId(entryName, undefined);
        if (id === false) {
            error({
                code: "UNRESOLVED_ENTRY",
                message: "Entry module cannot be external"
            });
        }
        if (is.nil(id)) {
            error({
                code: "UNRESOLVED_ENTRY",
                message: `Could not resolve entry (${entryName})`
            });
        }
        return this.fetchModule(id, undefined);
    }

    link() {
        this.modules.forEach((module) => module.linkDependencies());
        this.modules.forEach((module) => module.bindReferences());
    }

    includeMarked(modules) {
        if (this.treeshake) {
            let addedNewNodes;
            do {
                addedNewNodes = false;
                modules.forEach((module) => {
                    if (module.includeInBundle()) {
                        addedNewNodes = true;
                    }
                });
            } while (addedNewNodes);
        } else {
            // Necessary to properly replace namespace imports
            modules.forEach((module) => module.includeAllInBundle());
        }
    }

    async buildSingle(entryModuleId) {
        // Phase 1 – discovery. We load the entry module and find which
        // modules it imports, and import those, until we have all
        // of the entry module's dependencies
        timeStart("phase 1");
        const entryModule = await this.loadModule(entryModuleId);
        timeEnd("phase 1");
        // Phase 2 - linking. We populate the module dependency links and
        // determine the topological execution order for the bundle
        timeStart("phase 2");
        this.link();
        const { orderedModules, dynamicImports } = this.analyseExecution([entryModule]);
        timeEnd("phase 2");
        // Phase 3 – marking. We include all statements that should be included
        timeStart("phase 3");
        entryModule.markExports();
        dynamicImports.forEach((dynamicImportModule) => {
            if (entryModule !== dynamicImportModule) {
                dynamicImportModule.markExports();
            }
            // all dynamic import modules inlined for single-file build
            dynamicImportModule.namespace().includeVariable();
        });
        // only include statements that should appear in the bundle
        this.includeMarked(orderedModules);
        // check for unused external imports
        this.externalModules.forEach((module) => module.warnUnusedImports());
        timeEnd("phase 3");
        // Phase 4 – we construct the chunk itself, generating its import and export facades
        timeStart("phase 4");
        // generate the imports and exports for the output chunk file
        const chunk = new Chunk(this, orderedModules);
        chunk.setId(entryModule.id);
        chunk.collectDependencies();
        chunk.generateImports();
        chunk.generateEntryExports(entryModule);
        timeEnd("phase 4");
        return chunk;
    }

    buildChunks(entryModuleIds) {
        // Phase 1 – discovery. We load the entry module and find which
        // modules it imports, and import those, until we have all
        // of the entry module's dependencies
        timeStart("phase 1");
        return Promise.all(entryModuleIds.map((entryId) => this.loadModule(entryId))).then((entryModules) => {
            timeEnd("phase 1");
            // Phase 2 - linking. We populate the module dependency links and
            // determine the topological execution order for the bundle
            timeStart("phase 2");
            this.link();
            const { orderedModules, dynamicImports } = this.analyseExecution(entryModules);
            dynamicImports.forEach((dynamicImportModule) => {
                if (entryModules.indexOf(dynamicImportModule) === -1) {
                    entryModules.push(dynamicImportModule);
                }
            });
            // Phase 3 – marking. We include all statements that should be included
            timeStart("phase 3");
            entryModules.forEach((entryModule) => {
                entryModule.markExports();
            });
            // only include statements that should appear in the bundle
            this.includeMarked(orderedModules);
            // check for unused external imports
            this.externalModules.forEach((module) => module.warnUnusedImports());
            timeEnd("phase 3");
            // Phase 4 – we construct the chunks, working out the optimal chunking using
            // entry point graph colouring, before generating the import and export facades
            timeStart("phase 4");
            // TODO: there is one special edge case unhandled here and that is that any module
            //       exposed as an unresolvable export * (to a graph external export *,
            //       either as a namespace import reexported or top-level export *)
            //       should be made to be its own entry point module before chunking
            const chunkModules = {};
            orderedModules.forEach((module) => {
                const entryPointsHashStr = Uint8ArrayToHexString(module.entryPointsHash);
                const curChunk = chunkModules[entryPointsHashStr];
                if (curChunk) {
                    curChunk.push(module);
                } else {
                    chunkModules[entryPointsHashStr] = [module];
                }
            });
            // create each chunk
            const chunkList = [];
            Object.keys(chunkModules).forEach((entryHashSum) => {
                const chunk = chunkModules[entryHashSum];
                const chunkModulesOrdered = chunk.sort((moduleA, moduleB) => moduleA.execIndex > moduleB.execIndex ? 1 : -1);
                chunkList.push(new Chunk(this, chunkModulesOrdered));
            });
            // for each entry point module, ensure its exports
            // are exported by the chunk itself, with safe name deduping
            entryModules.forEach((entryModule) => {
                entryModule.chunk.generateEntryExports(entryModule);
            });
            // for each chunk module, set up its imports to other
            // chunks, if those variables are included after treeshaking
            chunkList.forEach((chunk) => {
                chunk.collectDependencies();
                chunk.generateImports();
            });
            // finally prepare output chunks
            const chunks = {};
            // name the chunks
            const chunkNames = blank();
            chunkNames.chunk = true;
            chunkList.forEach((chunk) => {
                // generate the imports and exports for the output chunk file
                if (chunk.entryModule) {
                    const entryName = generateChunkName(chunk.entryModule.id, chunkNames, true);
                    // if the chunk exactly exports the entry point exports then
                    // it can replace the entry point
                    if (chunk.isEntryModuleFacade) {
                        chunks[`./${entryName}`] = chunk;
                        chunk.setId(`./${entryName}`);
                        return;
                        // otherwise we create a special re-exporting entry point
                        // facade chunk with no modules
                    }
                    const entryPointFacade = new Chunk(this, []);
                    entryPointFacade.setId(`./${entryName}`);
                    entryPointFacade.collectDependencies(chunk.entryModule);
                    entryPointFacade.generateImports();
                    entryPointFacade.generateEntryExports(chunk.entryModule);
                    chunks[`./${entryName}`] = entryPointFacade;

                }
                // name the chunk itself
                const chunkName = generateChunkName("chunk", chunkNames);
                chunk.setId(`./${chunkName}`);
                chunks[`./${chunkName}`] = chunk;
            });
            timeEnd("phase 4");
            return chunks;
        });
    }

    analyseExecution(entryModules) {
        let curEntry;
        let curEntryHash;
        const allSeen = {};
        const ordered = [];
        const dynamicImports = [];
        const visit = (module, parents = { [module.id]: null }) => {
            if (module.isEntryPoint && module !== curEntry) {
                return;
            }
            // Track entry point graph colouring by tracing all modules loaded by a given
            // entry point and colouring those modules by the hash of its id. Colours are mixed as
            // hash xors, providing the unique colouring of the graph into unique hash chunks.
            // This is really all there is to automated chunking, the rest is chunk wiring.
            Uint8ArrayXor(module.entryPointsHash, curEntryHash);
            module.dependencies.forEach((depModule) => {
                if (!depModule.isExternal) {
                    if (depModule.id in parents) {
                        if (!allSeen[depModule.id]) {
                            this.warnCycle(depModule.id, module.id, parents);
                        }
                        return;
                    }
                    parents[depModule.id] = module.id;
                    visit(depModule, parents);
                }
            });
            if (this.dynamicImport) {
                module.dynamicImportResolutions.forEach((module) => {
                    if (module instanceof Module) {
                        if (dynamicImports.indexOf(module) === -1) {
                            dynamicImports.push(module);
                        }
                    }
                });
            }
            if (allSeen[module.id]) {
                return;
            }
            allSeen[module.id] = true;
            module.execIndex = ordered.length;
            ordered.push(module);
        };
        for (let i = 0; i < entryModules.length; i++) {
            curEntry = entryModules[i];
            curEntry.isEntryPoint = true;
            curEntryHash = randomUint8Array(10);
            visit(curEntry);
        }
        // new items can be added during this loop
        for (let i = 0; i < dynamicImports.length; i++) {
            curEntry = dynamicImports[i];
            curEntry.isEntryPoint = true;
            curEntryHash = randomUint8Array(10);
            visit(curEntry);
        }
        return { orderedModules: ordered, dynamicImports };
    }

    warnCycle(id, parentId, parents) {
        const path = [relativeId(id)];
        let curId = parentId;
        while (curId !== id) {
            path.push(relativeId(curId));
            curId = parents[curId];
            if (!curId) {
                break;
            }
        }
        path.push(path[0]);
        path.reverse();
        this.warn({
            code: "CIRCULAR_DEPENDENCY",
            importer: path[0],
            message: `Circular dependency: ${path.join(" -> ")}`
        });
    }

    async fetchModule(id, importer) {
        // short-circuit cycles
        const existingModule = this.moduleById.get(id);
        if (existingModule) {
            if (existingModule.isExternal) {
                throw new Error(`Cannot fetch external module ${id}`);
            }
            return Promise.resolve(existingModule);
        }
        const mod = new Module(this, id);
        this.moduleById.set(id, mod);

        try {
            let source = await this.load(id);

            if (!(is.string(source) || (source && typeof source === "object" && is.string(source.code)))) {
                // TODO report which plugin failed
                error({
                    code: "BAD_LOADER",
                    message: `Error loading ${relativeId(id)}: plugin load hook should return a string, a { code, map } object, or nothing/null`
                });
                return;
            }

            const sourceDescription = is.string(source) ? {
                code: source,
                ast: null
            } : source;
            if (this.cachedModules.has(id) && this.cachedModules.get(id).originalCode === sourceDescription.code) {
                source = this.cachedModules.get(id);
            } else {
                source = await transform(this, sourceDescription, id, this.plugins);
            }

            mod.setSource(source);
            this.modules.push(mod);
            this.moduleById.set(id, mod);
            await this.fetchAllDependencies(mod);
            Object.keys(mod.exports).forEach((name) => {
                if (name !== "default") {
                    mod.exportsAll[name] = mod.id;
                }
            });
            mod.exportAllSources.forEach((source) => {
                const id = mod.resolvedIds[source];
                const exportAllModule = this.moduleById.get(id);
                if (exportAllModule.isExternal) {
                    return;
                }
                Object.keys(exportAllModule.exportsAll).forEach((name) => {
                    if (name in mod.exportsAll) {
                        this.warn({
                            code: "NAMESPACE_CONFLICT",
                            reexporter: mod.id,
                            name,
                            sources: [
                                mod.exportsAll[name],
                                exportAllModule.exportsAll[name]
                            ],
                            message: `Conflicting namespaces: ${relativeId(mod.id)} re-exports '${name}' from both ${relativeId(mod.exportsAll[name])} and ${relativeId(exportAllModule.exportsAll[name])} (will be ignored)`
                        });
                    } else {
                        mod.exportsAll[name] = exportAllModule.exportsAll[name];
                    }
                });
            });
            return mod;
        } catch (err) {
            let msg = `Could not load ${id}`;
            if (importer) {
                msg += ` (imported by ${importer})`;
            }
            msg += `: ${err.message}`;
            throw new Error(msg);
        }
    }

    fetchAllDependencies(module) {
        // resolve and fetch dynamic imports where possible
        const fetchDynamicImportsPromise = !this.dynamicImport ? Promise.resolve() : Promise.all(module.getDynamicImportExpressions()
            .map((dynamicImportExpression, index) => {
                return Promise.resolve(this.resolveDynamicImport(dynamicImportExpression, module.id)).then((replacement) => {
                    if (!replacement) {
                        module.dynamicImportResolutions[index] = null;
                    } else if (!is.string(dynamicImportExpression)) {
                        module.dynamicImportResolutions[index] = replacement;
                    } else if (this.isExternal(replacement, module.id, true)) {
                        let externalModule;
                        if (!this.moduleById.has(replacement)) {
                            externalModule = new ExternalModule({ graph: this, id: replacement });
                            this.externalModules.push(externalModule);
                            this.moduleById.set(replacement, module);
                        } else {
                            externalModule = this.moduleById.get(replacement);
                        }
                        module.dynamicImportResolutions[index] = externalModule;
                        externalModule.exportsNamespace = true;
                    } else {
                        return this.fetchModule(replacement, module.id).then((depModule) => {
                            module.dynamicImportResolutions[index] = depModule;
                        });
                    }
                });
            }))
            .then(() => { });
        fetchDynamicImportsPromise.catch(() => { });
        return mapSequence(module.sources, (source) => {
            const resolvedId = module.resolvedIds[source];
            return (resolvedId ? Promise.resolve(resolvedId) : this.resolveId(source, module.id)).then((resolvedId) => {
                // TODO types of `resolvedId` are not compatable with 'externalId'.
                // `this.resolveId` returns `string`, `void`, and `boolean`
                const externalId = resolvedId || (isRelative(source) ? resolve(module.id, "..", source) : source);
                let isExternal = this.isExternal(externalId, module.id, true);
                if (!resolvedId && !isExternal) {
                    if (isRelative(source)) {
                        error({
                            code: "UNRESOLVED_IMPORT",
                            message: `Could not resolve '${source}' from ${relativeId(module.id)}`
                        });
                    }
                    if (resolvedId !== false) {
                        this.warn({
                            code: "UNRESOLVED_IMPORT",
                            source,
                            importer: relativeId(module.id),
                            message: `'${source}' is imported by ${relativeId(module.id)}, but could not be resolved – treating it as an external dependency`,
                            url: "https://github.com/rollup/rollup/wiki/Troubleshooting#treating-module-as-external-dependency"
                        });
                    }
                    isExternal = true;
                }
                if (isExternal) {
                    module.resolvedIds[source] = externalId;
                    if (!this.moduleById.has(externalId)) {
                        const module = new ExternalModule({ graph: this, id: externalId });
                        this.externalModules.push(module);
                        this.moduleById.set(externalId, module);
                    }
                    const externalModule = this.moduleById.get(externalId);
                    // add external declarations so we can detect which are never used
                    Object.keys(module.imports).forEach((name) => {
                        const importDeclaration = module.imports[name];
                        if (importDeclaration.source !== source) {
                            return;
                        }
                        externalModule.traceExport(importDeclaration.name);
                    });
                } else {
                    module.resolvedIds[source] = resolvedId;
                    return this.fetchModule(resolvedId, module.id);
                }
            });
        }).then(() => fetchDynamicImportsPromise);
    }

    warn(warning) {
        warning.toString = () => {
            let str = "";
            if (warning.plugin) {
                str += `(${warning.plugin} plugin) `;
            }
            if (warning.loc) {
                str += `${relativeId(warning.loc.file)} (${warning.loc.line}:${warning.loc.column}) `;
            }
            str += warning.message;
            return str;
        };
        this.onwarn(warning);
    }
}
