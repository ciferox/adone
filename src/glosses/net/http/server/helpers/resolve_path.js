
const {
    std: { path: { sep, resolve, normalize } },
    net: { http },
    exception,
    is
} = adone;

const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export default function resolvePath(root, path) {
    if (is.undefined(path)) {
        [root, path] = [process.cwd(), root];
    }

    if (is.nil(root)) {
        throw new exception.InvalidArgument("argument rootPath is required");
    }

    if (!is.string(root)) {
        throw new exception.InvalidArgument("argument rootPath must be a string");
    }

    if (is.nil(path)) {
        throw new exception.InvalidArgument("argument relativePath is required");
    }

    if (!is.string(path)) {
        throw new exception.InvalidArgument("argument relativePath must be a string");
    }

    // containing NULL bytes is malicious
    if (path.includes("\0")) {
        throw http.exception.create(400, "Malicious Path");
    }

    // path should never be absolute
    if (is.posixPathAbsolute(path) || is.win32PathAbsolute(path)) {
        throw http.exception.create(400, "Malicious Path");
    }

    // path outside root
    if (UP_PATH_REGEXP.test(normalize(`.${sep}${path}`))) {
        throw http.exception.create(403);
    }

    root = normalize(`${resolve(root)}${sep}`);

    return resolve(root, path);
}
