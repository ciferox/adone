const DEFAULT_OPTIONS = {
    compact: false,
    only: [/\.js$/],
    sourceMaps: "both",
    plugins: adone.module.COMPILER_PLUGINS
};

const maps = new Map();

const ___ = (options = DEFAULT_OPTIONS) => (mod, content, filename) => {
    // ignore node_modules
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
    const { code, map } = adone.js.compiler.core.transform(content, {
        ...options,
        filename
    });

    maps.set(filename, map);

    return code;
};

___.options = DEFAULT_OPTIONS;
___.maps = maps;

export default ___;
