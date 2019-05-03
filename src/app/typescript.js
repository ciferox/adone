// Adapted from https://github.com/TypeStrong/ts-node

const {
    is,
    path: aPath,
    std: { module: { Module }, util }
} = adone;

const INSPECT_CUSTOM = util.inspect.custom || "inspect";
const TS_COMPILER_OPTIONS = {
    sourceMap: true,
    inlineSourceMap: false,
    inlineSources: true,
    declaration: false,
    noEmit: false,
    outDir: "$$ts-adone$$"
};

export class TSException extends adone.error.Exception {
    constructor(diagnosticText, diagnosticCodes) {
        super(`⨯ Unable to compile TypeScript:\n${diagnosticText}`);
        this.diagnosticText = diagnosticText;
        this.diagnosticCodes = diagnosticCodes;
        this.name = "TSException";
    }

    [INSPECT_CUSTOM]() {
        return this.diagnosticText;
    }
}

const normalizeSlashes = (value) => value.replace(/\\/g, "/");

const readConfig = (cwd, ts, fileExists, readFile, options) => {
    let config = { compilerOptions: {} };
    let basePath = cwd;
    let configFileName = undefined;
    // Read project configuration when available.
    if (options.tsConfig) {
        configFileName = options.tsConfig
            ? aPath.resolve(cwd, options.tsConfig)
            : ts.findConfigFile(cwd, fileExists);
        if (configFileName) {
            const result = ts.readConfigFile(configFileName, readFile);
            // Return diagnostics.
            if (result.error) {
                return {
                    errors: [result.error],
                    fileNames: [],
                    options: {}
                };
            }
            config = result.config;
            basePath = aPath.dirname(configFileName);
        }
    }
    // Remove resolution of "files".
    options.files = options.tsFiles;
    delete options.tsFiles;
    if (!options.files) {
        config.files = [];
        config.include = [];
    }
    // Override default configuration options `ts-node` requires.
    config.compilerOptions = Object.assign({}, config.compilerOptions, TS_COMPILER_OPTIONS);
    config = ts.parseJsonConfigFileContent(config, ts.sys, basePath, undefined, configFileName);

    // Delete options that *should not* be passed through.
    delete config.options.out;
    delete config.options.outFile;
    delete config.options.composite;
    delete config.options.declarationDir;
    delete config.options.declarationMap;
    delete config.options.emitDeclarationOnly;
    delete config.options.tsBuildInfoFile;
    delete config.options.incremental;
    // Target ES5 output by default (instead of ES3).
    if (is.undefined(config.options.target)) {
        config.options.target = ts.ScriptTarget.ES5;
    }
    // Target CommonJS modules by default (instead of magically switching to ES6 when the target is ES6).
    if (is.undefined(config.options.module)) {
        config.options.module = ts.ModuleKind.CommonJS;
    }
    return config;
};

const filterDiagnostics = (diagnostics, ignore) => diagnostics.filter((x) => !ignore.includes(x.code));

const cachedLookup = (fn) => {
    const cache = new Map();
    return (arg) => {
        if (!cache.has(arg)) {
            cache.set(arg, fn(arg));
        }
        return cache.get(arg) || false;
    };
};


/**
 * Update the source map contents for improved output.
 */
const updateSourceMap = (sourceMapText, fileName) => {
    const sourceMap = JSON.parse(sourceMapText);
    sourceMap.file = fileName;
    sourceMap.sources = [fileName];
    delete sourceMap.sourceRoot;
    return JSON.stringify(sourceMap);
};

/**
 * Update the output remapping the source map.
 */
const updateOutput = (outputText, fileName, sourceMap, getExtension) => {
    const base64Map = Buffer.from(updateSourceMap(sourceMap, fileName), "utf8").toString("base64");
    const sourceMapContent = `data:application/json;charset=utf-8;base64,${base64Map}`;
    const sourceMapLength = `${aPath.basename(fileName)}.map`.length + (getExtension(fileName).length - aPath.extname(fileName).length);
    return outputText.slice(0, -sourceMapLength) + sourceMapContent;
};

const shouldIgnore = (filename, ignore) => {
    const relname = normalizeSlashes(filename);
    return ignore.some((x) => x.test(relname));
};

/**
 * Track the project information.
 */
class MemoryCache {
    constructor(rootFileNames = []) {
        this.rootFileNames = rootFileNames;
        this.fileContents = new Map();
        this.fileVersions = new Map();
        for (const fileName of rootFileNames) {
            this.fileVersions.set(fileName, 1);
        }
    }
}

// const lineCount = (value) => {
//     let count = 0;

//     for (const char of value) {
//         if (char === "\n") {
//             count++;
//         }
//     }

//     return count;
// };

export class TypeScriptManager {
    constructor(options) {
        this.options = options;
        this.filename = "[eval].ts";
        this.filepath = adone.path.join(this.options.cwd, this.filename);
        this.evalInstance = {
            input: "",
            output: "",
            version: 0,
            lines: 0
        };
    }

    register() {
        const options = Object.assign({}, this.options);
        const originalJsHandler = require.extensions[".js"];
        const ignoreDiagnostics = [
            6059,
            18002,
            18003,
            ...(options.tsIgnoreDiagnostics || [])
        ].map(Number);
        const ignore = (options.ignore || ["/node_modules/"]).map((str) => new RegExp(str));

        const { cwd, tsTypeCheck } = options;

        const ts = adone.typescript;
        const transformers = options.transformers || undefined;
        const readFile = options.readFile || ts.sys.readFile;
        const fileExists = options.fileExists || ts.sys.fileExists;
        const config = readConfig(cwd, ts, fileExists, readFile, options);
        const configDiagnosticList = filterDiagnostics(config.errors, ignoreDiagnostics);
        const extensions = [".ts"];
        const outputCache = new Map();
        const diagnosticHost = {
            getNewLine: () => ts.sys.newLine,
            getCurrentDirectory: () => cwd,
            getCanonicalFileName: (path) => path
        };
        // Install source map support and read from memory cache.
        adone.sourcemap.support.install({
            environment: "node",
            retrieveFile(path) {
                return outputCache.get(path) || "";
            }
        });
        const formatDiagnostics = process.stdout.isTTY
            ? ts.formatDiagnosticsWithColorAndContext
            : ts.formatDiagnostics;
        const createTSError = (diagnostics) => {
            const diagnosticText = formatDiagnostics(diagnostics, diagnosticHost);
            const diagnosticCodes = diagnostics.map((x) => x.code);
            return new TSException(diagnosticText, diagnosticCodes);
        };

        const reportTSError = (configDiagnosticList) => {
            throw createTSError(configDiagnosticList);
        };

        // Render the configuration errors.
        if (configDiagnosticList.length) {
            reportTSError(configDiagnosticList);
        }
        // Enable additional extensions when JSX or `allowJs` is enabled.
        if (config.options.jsx) {
            extensions.push(".tsx");
        }
        if (config.options.allowJs) {
            extensions.push(".js");
        }
        if (config.options.jsx && config.options.allowJs) {
            extensions.push(".jsx");
        }
        /**
         * Get the extension for a transpiled file.
         */
        const getExtension = config.options.jsx === ts.JsxEmit.Preserve ?
            ((path) => /\.[tj]sx$/.test(path) ? ".jsx" : ".js") :
            ((_) => ".js");
        /**
         * Create the basic required function using transpile mode.
         */
        let getOutput = function (code, fileName, lineOffset = 0) {
            const result = ts.transpileModule(code, {
                fileName,
                transformers,
                compilerOptions: config.options,
                reportDiagnostics: true
            });
            const diagnosticList = result.diagnostics ?
                filterDiagnostics(result.diagnostics, ignoreDiagnostics) :
                [];
            if (diagnosticList.length) {
                reportTSError(configDiagnosticList);
            }
            return [result.outputText, result.sourceMapText];
        };
        let getTypeInfo = function (_code, _fileName, _position) {
            throw new TypeError("Type information is unavailable without '--ts-type-check'");
        };
        // Use full language services when the fast option is disabled.
        if (tsTypeCheck) {
            const memoryCache = new MemoryCache(config.fileNames);
            // Create the compiler host for type checking.
            const serviceHost = {
                getScriptFileNames: () => memoryCache.rootFileNames,
                getScriptVersion: (fileName) => {
                    const version = memoryCache.fileVersions.get(fileName);
                    return is.undefined(version) ? "" : version.toString();
                },
                getScriptSnapshot(fileName) {
                    let contents = memoryCache.fileContents.get(fileName);
                    // Read contents into TypeScript memory cache.
                    if (is.undefined(contents)) {
                        contents = readFile(fileName);
                        if (is.undefined(contents)) {
                            return;
                        }
                        memoryCache.fileVersions.set(fileName, 1);
                        memoryCache.fileContents.set(fileName, contents);
                    }
                    return ts.ScriptSnapshot.fromString(contents);
                },
                fileExists: cachedLookup(fileExists),
                readFile,
                readDirectory: ts.sys.readDirectory,
                getDirectories: ts.sys.getDirectories,
                directoryExists: cachedLookup(ts.sys.directoryExists),
                realpath: ts.sys.realpath,
                getNewLine: () => ts.sys.newLine,
                useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
                getCurrentDirectory: () => cwd,
                getCompilationSettings: () => config.options,
                getDefaultLibFileName: (diffLines) => ts.getDefaultLibFilePath(config.options),
                getCustomTransformers: (diffLines) => transformers
            };
            const registry = ts.createDocumentRegistry(ts.sys.useCaseSensitiveFileNames, cwd);
            const service = ts.createLanguageService(serviceHost, registry);
            // Set the file contents into cache manually.
            const updateMemoryCache = function (contents, fileName) {
                const fileVersion = memoryCache.fileVersions.get(fileName) || 0;
                // Add to `rootFiles` when discovered for the first time.
                if (fileVersion === 0) {
                    memoryCache.rootFileNames.push(fileName);
                }
                // Avoid incrementing cache when nothing has changed.
                if (memoryCache.fileContents.get(fileName) === contents) {
                    return;
                }
                memoryCache.fileVersions.set(fileName, fileVersion + 1);
                memoryCache.fileContents.set(fileName, contents);
            };
            getOutput = function (code, fileName) {
                updateMemoryCache(code, fileName);
                const output = service.getEmitOutput(fileName);
                // Get the relevant diagnostics - this is 3x faster than `getPreEmitDiagnostics`.
                const diagnostics = service.getSemanticDiagnostics(fileName)
                    .concat(service.getSyntacticDiagnostics(fileName));
                const diagnosticList = filterDiagnostics(diagnostics, ignoreDiagnostics);
                if (diagnosticList.length) {
                    reportTSError(diagnosticList);
                }
                if (output.emitSkipped) {
                    throw new TypeError(`${aPath.relative(cwd, fileName)}: Emit skipped`);
                }
                // Throw an error when requiring `.d.ts` files.
                if (output.outputFiles.length === 0) {
                    throw new TypeError("Unable to require `.d.ts` file.\n" +
                        "This is usually the result of a faulty configuration or import. " +
                        "Make sure there is a `.js`, `.json` or another executable extension and " +
                        "loader (attached before `ts-node`) available alongside " +
                        `\`${aPath.basename(fileName)}\`.`);
                }
                return [output.outputFiles[1].text, output.outputFiles[0].text];
            };
            getTypeInfo = function (code, fileName, position) {
                updateMemoryCache(code, fileName);
                const info = service.getQuickInfoAtPosition(fileName, position);
                const name = ts.displayPartsToString(info ? info.displayParts : []);
                const comment = ts.displayPartsToString(info ? info.documentation : []);
                return { name, comment };
            };
        }
        // Create a simple TypeScript compiler proxy.
        const compile = (code, fileName) => {
            const [value, sourceMap] = getOutput(code, fileName);
            const output = updateOutput(value, fileName, sourceMap, getExtension);
            outputCache.set(fileName, output);
            return output;
        };

        const service = this.service = { cwd, compile, getTypeInfo, extensions, ts };

        extensions.forEach((extension) => {
            const old = require.extensions[extension] || originalJsHandler;
            require.extensions[extension] = function (m, filename) {
                if (shouldIgnore(filename, ignore)) {
                    return old(m, filename);
                }
                const _compile = m._compile;
                m._compile = function (code, fileName) {
                    return _compile.call(this, service.compile(code, fileName), fileName);
                };
                return old(m, filename);
            };
        });
        return service;
    }

    appendEval(input) {
        const undoInput = this.evalInstance.input;
        const undoVersion = this.evalInstance.version;
        const undoOutput = this.evalInstance.output;
        // const undoLines = this.evalInstance.lines;

        // Handle ASI issues with TypeScript re-evaluation.
        if (undoInput.charAt(undoInput.length - 1) === "\n" && /^\s*[\[\(\`]/.test(input) && !/;\s*$/.test(undoInput)) {
            this.evalInstance.input = `${this.evalInstance.input.slice(0, -1)};\n`;
        }

        this.evalInstance.input += input;
        // this.evalInstance.lines += lineCount(input);
        this.evalInstance.version++;

        return () => {
            this.evalInstance.input = undoInput;
            this.evalInstance.output = undoOutput;
            this.evalInstance.version = undoVersion;
            // this.evalInstance.lines = undoLines;
        };
    }

    evalCode(code, print) {
        const module = new Module(this.filename);
        module.filename = this.filename;
        module.paths = Module._nodeModulePaths(this.options.cwd);
        global.__filename = this.filename;
        global.__dirname = this.options.cwd;
        global.exports = module.exports;
        global.module = module;
        global.require = module.require.bind(module);
        let result;
        try {
            const output = this.service.compile(code, this.filepath);
            const script = new adone.std.vm.Script(output, { filename: this.filename });
            result = script.runInThisContext();
        } catch (error) {
            if (error instanceof TSException) {
                console.error(error.diagnosticText);
                process.exit(1);
            }
            throw error;
        }
        if (print) {
            console.log(is.string(result) ? result : util.inspect(result));
        }
    }

    getTransform(repl) {
        const that = this;
        repl.defineCommand("type", {
            help: "Check the type of a TypeScript identifier",
            action(identifier) {
                if (!identifier) {
                    repl.displayPrompt();
                    return;
                }

                const undo = that.appendEval(identifier);
                const { name, comment } = that.service.getTypeInfo(that.evalInstance.input, that.filepath, that.evalInstance.input.length);

                undo();

                repl.outputStream.write(`${name}\n${comment ? `${comment}\n` : ""}`);
                repl.displayPrompt();
            }
        });

        const RECOVERY_CODES = new Set([
            1003,
            1005,
            1109,
            1126,
            1160,
            1161,
            2355 // "A function whose declared type is neither 'void' nor 'any' must return a value."
        ]);

        /**
         * Check if a function can recover gracefully.
         */
        const isRecoverable = (error) => error.diagnosticCodes.every((code) => RECOVERY_CODES.has(code));

        // Bookmark the point where we should reset the REPL state.
        const resetEval = this.appendEval("");

        const reset = function () {
            resetEval();

            // Hard fix for TypeScript forcing `Object.defineProperty(exports, ...)`.
            // exec("exports = module.exports", EVAL_FILENAME);
        };

        reset();
        repl.on("reset", reset);

        return (code, filename) => {
            try {
                const isCompletion = !/\n$/.test(code);
                const undo = this.appendEval(code);
                let output;

                try {
                    output = this.service.compile(this.evalInstance.input, this.filepath);
                } catch (err) {
                    undo();
                    throw err;
                }

                // Use `diff` to check for new JavaScript to execute.
                const changes = adone.diff.diffLines(this.evalInstance.output, output);

                if (isCompletion) {
                    undo();
                } else {
                    this.evalInstance.output = output;
                }

                return changes.reduce((result, change) => change.added ? `${result}\n${change.value}` : result, "");
            } catch (err) {
                if (err instanceof TSException) {
                    // Support recoverable compilations using >= node 6.
                    if (adone.std.repl.Recoverable && isRecoverable(err)) {
                        err = new adone.std.repl.Recoverable(err);
                    } else {
                        console.error(err.diagnosticText);
                        return undefined;
                    }
                }
                throw err;
            }
        };
    }
}

export const register = (options) => {
    const ts = new TypeScriptManager(options);
    ts.register();
    return ts;
};
