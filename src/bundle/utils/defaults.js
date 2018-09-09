import error from './error';
import { lstatSync, readdirSync, readFileSync, realpathSync } from './fs'; // eslint-disable-line
import { basename, dirname, isAbsolute, resolve } from './path';
import relativeId from './relativeId';
export function load(id) {
    return readFileSync(id, 'utf-8');
}
function findFile(file, preserveSymlinks) {
    try {
        const stats = lstatSync(file);
        if (!preserveSymlinks && stats.isSymbolicLink())
            return findFile(realpathSync(file), preserveSymlinks);
        if ((preserveSymlinks && stats.isSymbolicLink()) || stats.isFile()) {
            // check case
            const name = basename(file);
            const files = readdirSync(dirname(file));
            if (files.indexOf(name) !== -1)
                return file;
        }
    }
    catch (err) {
        // suppress
    }
}
function addJsExtensionIfNecessary(file, preserveSymlinks) {
    let found = findFile(file, preserveSymlinks);
    if (found)
        return found;
    found = findFile(file + '.mjs', preserveSymlinks);
    if (found)
        return found;
    found = findFile(file + '.js', preserveSymlinks);
    return found;
}
export function resolveId(options) {
    return function (importee, importer) {
        if (typeof process === 'undefined') {
            error({
                code: 'MISSING_PROCESS',
                message: `It looks like you're using Rollup in a non-Node.js environment. This means you must supply a plugin with custom resolveId and load functions`,
                url: 'https://github.com/rollup/rollup/wiki/Plugins'
            });
        }
        // external modules (non-entry modules that start with neither '.' or '/')
        // are skipped at this stage.
        if (importer !== undefined && !isAbsolute(importee) && importee[0] !== '.')
            return null;
        // `resolve` processes paths from right to left, prepending them until an
        // absolute path is created. Absolute importees therefore shortcircuit the
        // resolve call and require no special handing on our part.
        // See https://nodejs.org/api/path.html#path_path_resolve_paths
        return addJsExtensionIfNecessary(resolve(importer ? dirname(importer) : resolve(), importee), options.preserveSymlinks);
    };
}
export function makeOnwarn() {
    const warned = Object.create(null);
    return (warning) => {
        const str = warning.toString();
        if (str in warned)
            return;
        console.error(str); //eslint-disable-line no-console
        warned[str] = true;
    };
}
export function handleMissingExport(exportName, importingModule, importedModule, importerStart) {
    importingModule.error({
        code: 'MISSING_EXPORT',
        message: `'${exportName}' is not exported by ${relativeId(importedModule)}`,
        url: `https://github.com/rollup/rollup/wiki/Troubleshooting#name-is-not-exported-by-module`
    }, importerStart);
}