const {
    std: { path: { basename, dirname, join, normalize, sep, posix: { isAbsolute: posixIsAbsolute }, win32: { isAbsolute: win32IsAbsolute } } }
} = adone;

export const stripDir = function (path, strip) {
    if (strip > 0) {
        if (posixIsAbsolute(path) || win32IsAbsolute(path)) {
            throw new adone.error.InvalidArgumentException(`Path should be relative, got: ${path}`);
        }

        const pathComponents = normalize(path).split(sep);

        if (pathComponents.length > 1 && pathComponents[0] === ".") {
            pathComponents.shift();
        }

        if (strip > pathComponents.length - 1) {
            return normalize(pathComponents[pathComponents.length - 1]);
        }

        return join(...pathComponents.slice(strip));
    }
    return join(dirname(path), basename(path));
};
