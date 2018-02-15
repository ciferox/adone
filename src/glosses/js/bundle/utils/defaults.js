import { lstatSync, readdirSync, readFileSync, realpathSync } from './fs'; // eslint-disable-line
import { basename, dirname, isAbsolute, resolve } from "./path";
import { blank } from "./object";
import error from "./error";
import relativeId from "./relativeId";

const {
    is
} = adone;

export const load = (id) => {
    const content = readFileSync(id, "utf-8");

    const { code/*, map*/ } = adone.js.compiler.core.transform(content, {
        compact: false,
        only: [/\.js$/],
        sourceMaps: false, //"inline",
        plugins: [
            "transform.flowStripTypes",
            "syntax.decorators",
            // "transform.decorators",
            // ["transform.classProperties", { loose: true }],
            "transform.destructuring",
            // "transform.objectRestSpread",
            "transform.numericSeparator"
        ],
        filename: adone.std.path.resolve(process.cwd(), id)
    });

    return code;
};

const findFile = function (file, preserveSymlinks) {
    try {
        const stats = lstatSync(file);
        if (!preserveSymlinks && stats.isSymbolicLink()) {
            return findFile(realpathSync(file), preserveSymlinks);
        }
        if ((preserveSymlinks && stats.isSymbolicLink()) || stats.isFile()) {
            // check case
            const name = basename(file);
            const files = readdirSync(dirname(file));
            if (files.includes(name)) {
                return file;
            }
        }
    } catch (err) {
        // suppress
    }
};

const addJsExtensionIfNecessary = (file, preserveSymlinks) => findFile(file, preserveSymlinks) || findFile(`${file}.js`, preserveSymlinks);

export const resolveId = function (options) {
    return function (importee, importer) {
        if (is.undefined(process)) {
            error({
                code: "MISSING_PROCESS",
                message: "It looks like you're using Rollup in a non-Node.js environment. This means you must supply a plugin with custom resolveId and load functions",
                url: "https://github.com/rollup/rollup/wiki/Plugins"
            });
        }
        // external modules (non-entry modules that start with neither '.' or '/')
        // are skipped at this stage.
        if (!is.undefined(importer) && !isAbsolute(importee) && importee[0] !== ".") {
            return null;
        }
        // `resolve` processes paths from right to left, prepending them until an
        // absolute path is created. Absolute importees therefore shortcircuit the
        // resolve call and require no special handing on our part.
        // See https://nodejs.org/api/path.html#path_path_resolve_paths
        return addJsExtensionIfNecessary(resolve(importer ? dirname(importer) : resolve(), importee), options.preserveSymlinks);
    };
};


export const makeOnwarn = function () {
    const warned = blank();
    return (warning) => {
        const str = warning.toString();
        if (str in warned) {
            return;
        }
        console.error(str); //eslint-disable-line no-console
        warned[str] = true;
    };
};

export const handleMissingExport = function (module, name, otherModule, start) {
    module.error({
        code: "MISSING_EXPORT",
        message: `'${name}' is not exported by ${relativeId(otherModule.id)}`,
        url: "https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module"
    }, start);
};
