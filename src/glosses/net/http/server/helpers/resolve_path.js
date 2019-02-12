
const {
    std: { path: { sep, resolve, normalize, join } },
    net: { http },
    error,
    is
} = adone;

const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export default function resolvePath(root, path) {
    if (is.undefined(path)) {
        [root, path] = [process.cwd(), root];
    }

    if (is.nil(root)) {
        throw new error.InvalidArgumentException("argument rootPath is required");
    }

    if (!is.string(root)) {
        throw new error.InvalidArgumentException("argument rootPath must be a string");
    }

    if (is.nil(path)) {
        throw new error.InvalidArgumentException("argument relativePath is required");
    }

    if (!is.string(path)) {
        throw new error.InvalidArgumentException("argument relativePath must be a string");
    }

    // containing NULL bytes is malicious
    if (path.includes("\0")) {
        throw http.error.create(400, "Malicious Path");
    }

    // path should never be absolute
    if (is.posixPathAbsolute(path) || is.win32PathAbsolute(path)) {
        throw http.error.create(400, "Malicious Path");
    }

    // path outside root
    if (UP_PATH_REGEXP.test(normalize(`.${sep}${path}`))) {
        throw http.error.create(403);
    }

    return normalize(join(resolve(root), path));
}
