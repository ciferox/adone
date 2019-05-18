const {
    is,
    path,
    util
} = adone;

const { helper } = adone.getPrivate(adone.fast);

const filterDiagnostics = (diagnostics, ignore) => diagnostics.filter((x) => !ignore.includes(x.code));
const INSPECT_CUSTOM = adone.std.util.inspect.custom || "inspect";

class TSException extends adone.error.Exception {
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

const TS_COMPILER_OPTIONS = {
    sourceMap: true,
    inlineSourceMap: false,
    inlineSources: true,
    declaration: false,
    noEmit: false
    // outDir: "$$ts-adone$$"
};

const readConfig = (ts, fileExists, readFile, options) => {
    let config = { compilerOptions: {} };
    let basePath = options.cwd;
    let configFileName = undefined;
    // Read project configuration when available.
    if (options.tsConfig) {
        configFileName = options.tsConfig
            ? path.resolve(options.cwd, options.tsConfig)
            : ts.findConfigFile(options.cwd, fileExists);
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
            basePath = path.dirname(configFileName);
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

export default function tscompilePlugin() {
    return function tscompile(options) {
        options = util.clone(options);

        const ignoreDiagnostics = [
            6059,
            18002,
            18003,
            ...(options.tsIgnoreDiagnostics || [])
        ].map(Number);

        const ts = adone.typescript;
        const transformers = options.transformers || undefined;
        const readFile = options.readFile || ts.sys.readFile;
        const fileExists = options.fileExists || ts.sys.fileExists;
        const config = readConfig(ts, fileExists, readFile, options);
        const configDiagnosticList = filterDiagnostics(config.errors, ignoreDiagnostics);
        // const outputCache = new Map();
        const diagnosticHost = {
            getNewLine: () => ts.sys.newLine,
            getCurrentDirectory: () => options.cwd,
            getCanonicalFileName: (path) => path
        };

        const reportTSError = (diagnostics) => {
            const diagnosticText = ts.formatDiagnostics(diagnostics, diagnosticHost);
            const diagnosticCodes = diagnostics.map((x) => x.code);
            throw new TSException(diagnosticText, diagnosticCodes);
        };

        // Render the configuration errors.
        if (configDiagnosticList.length) {
            reportTSError(configDiagnosticList);
        }

        return this.throughSync(function (file) {
            if (!file.isNull()) {
                const code = file.contents.toString();
                const fileName = file.path;
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
                const map = result.sourceMapText;

                if (file.sourceMap && map) {
                    helper.applySourceMap(file, map);
                }

                file.contents = Buffer.from(result.outputText);
                file.extname = ".js";
            }
            this.push(file);
        });
    };
}
