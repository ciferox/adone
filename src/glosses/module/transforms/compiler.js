const DEFAULT_OPTIONS = {
    compact: false,
    only: [/\.js$/],
    sourceMaps: "inline",
    plugins: adone.module.COMPILER_PLUGINS
};

const ___ = (options = DEFAULT_OPTIONS) => (mod, content, filename) => {
    if (adone.regex.nodeModules().test(filename)) {
        return content;
    }
    if (adone.sourcemap.convert.getMapFileCommentRegex().test(content)) {
        // a source map exists, assume it has been transpiled
        return content;
    }
    if (!filename.endsWith(".js")) { // ??? without this it's impossible to transpile files with extensions other than '.js'.
        filename = `${filename}.js`;
    }
    const { code } = adone.js.compiler.core.transform(content, {
        ...options,
        filename
    });
    return code;
};

___.options = DEFAULT_OPTIONS;

export default ___;
