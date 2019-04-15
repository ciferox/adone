adone.lazify({
    getParentPath: "./get_parent_path",
    Module: "./module",
    require: "./require",
    resolve: "./resolve"
}, adone.asNamespace(exports), require);

export const COMPILER_PLUGINS = [
    "transform.flowStripTypes",
    ["transform.decorators", { legacy: true }],
    ["transform.classProperties", { loose: true }],
    ["transform.privateMethods", { loose: true }],
    "transform.doExpressions",
    "transform.exportDefaultFrom",
    "transform.partialApplication",
    "transform.modulesCommonjs",
    "transform.numericSeparator"
];

export const babelTransform = (options) => {
    options = Object.assign({}, options);
    const ErrorConstructor = options.Error || Error;
    delete options.Error;
    const transform = (content, filename) => {
        if (filename.includes("node_modules")) {
            return content;
        }
        if (adone.sourcemap.convert.getMapFileCommentRegex().test(content)) {
            // a source map exists, assume it has been transpiled
            return content;
        }
        if (!filename.endsWith(".js")) { // ??? without this it's impossible to transpile files with extensions other than '.js'.
            filename = `${filename}.js`;
        }
        options = Object.assign(options, { filename, sourceMaps: "both" });
        const { code, map } = adone.js.compiler.core.transform(content, options);
        if (map) {
            transform.sourceMaps.set(filename, { map, url: filename });
        }
        return code;
    };
    transform.sourceMaps = new Map();
    transform.retrieveMapHandler = (path) => {
        if (transform.sourceMaps.has(path)) {
            return transform.sourceMaps.get(path);
        }
    };
    if (ErrorConstructor[Symbol.for("sourceMaps")]) {
        ErrorConstructor[Symbol.for("sourceMaps")].retrieveMapHandlers.unshift(transform.retrieveMapHandler);
    }
    return transform;
};
