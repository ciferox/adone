const {
    exception,
    util
} = adone;

const EMPTY = Symbol("empty");

export const getArg = (args, name, defaultValue = EMPTY) => {
    if (name in args) {
        return args[name];
    }
    if (defaultValue !== EMPTY) {
        return defaultValue;
    }
    throw new exception.InvalidArgument(`"${name}" is a required argument.`);
};

const urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
const dataUrlRegexp = /^data:.+\,.+$/;

export const urlParse = (url) => {
    const match = url.match(urlRegexp);
    if (!match) {
        return null;
    }
    return {
        scheme: match[1],
        auth: match[2],
        host: match[3],
        port: match[4],
        path: match[5]
    };
};

export const urlGenerate = (parsedUrl) => {
    let url = "";
    if (parsedUrl.scheme) {
        url += `${parsedUrl.scheme}:`;
    }
    url += "//";
    if (parsedUrl.auth) {
        url += `${parsedUrl.auth}@`;
    }
    if (parsedUrl.host) {
        url += parsedUrl.host;
    }
    if (parsedUrl.port) {
        url += `:${parsedUrl.port}`;
    }
    if (parsedUrl.path) {
        url += parsedUrl.path;
    }
    return url;
};

export const isAbsolute = (path) => path[0] === "/" || Boolean(path.match(urlRegexp));

export const normalize = (path) => {
    const url = urlParse(path);
    if (url) {
        if (!url.path) {
            return path;
        }
        ({ path } = url);
    }

    const isAbs = isAbsolute(path);

    const parts = path.split(/\/+/);
    for (let part, up = 0, i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        if (part === ".") {
            parts.splice(i, 1);
        } else if (part === "..") {
            up++;
        } else if (up > 0) {
            if (part === "") {
                // The first part is blank if the path is absolute.
                // Trying to go above the root is a no-op.
                // Therefore we can remove all '..' parts directly after the root.
                parts.splice(i + 1, up);
                up = 0;
            } else {
                parts.splice(i, 2);
                up--;
            }
        }
    }
    path = parts.join("/");

    if (path === "") {
        path = isAbs ? "/" : ".";
    }

    if (url) {
        url.path = path;
        return urlGenerate(url);
    }
    return path;
};

export const join = (root, path) => {
    if (root === "") {
        root = ".";
    }
    if (path === "") {
        path = ".";
    }
    const aPathUrl = urlParse(path);
    const aRootUrl = urlParse(root);
    if (aRootUrl) {
        root = aRootUrl.path || "/";
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
        if (aRootUrl) {
            aPathUrl.scheme = aRootUrl.scheme;
        }
        return urlGenerate(aPathUrl);
    }

    if (aPathUrl || path.match(dataUrlRegexp)) {
        return path;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
        aRootUrl.host = path;
        return urlGenerate(aRootUrl);
    }

    const joined = path[0] === "/" ? path : normalize(`${root.replace(/\/+$/, "")}/${path}`);

    if (aRootUrl) {
        aRootUrl.path = joined;
        return urlGenerate(aRootUrl);
    }
    return joined;
};

export const relative = (root, path) => {
    if (root === "") {
        root = ".";
    }

    root = root.replace(/\/$/, "");

    // It is possible for the path to be above the root.
    // In this case, simply checking whether the root is a prefix of the path won't work.
    // Instead, we need to remove components from the root one by one,
    // until either we find a prefix that fits, or we run out of components to remove.
    let level = 0;
    while (!path.startsWith(`${root}/`)) {
        const index = root.lastIndexOf("/");
        if (index < 0) {
            return path;
        }

        // If the only part of the root that is left is the scheme (i.e. http://, file:///, etc.),
        // one or more slashes (/), or simply nothing at all,
        // we have exhausted all components, so the path is not relative to the root.
        root = root.slice(0, index);
        if (root.match(/^([^\/]+:\/)?\/*$/)) {
            return path;
        }

        ++level;
    }

    return "../".repeat(level) + path.substr(root.length + 1);
};

export const compareByOriginalPositions = (mappingA, mappingB, onlyCompareOriginal) => {
    let cmp = mappingA.source - mappingB.source;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
        return cmp;
    }

    return mappingA.name - mappingB.name;
};

export const compareByGeneratedPositionsDeflated = (mappingA, mappingB, onlyCompareGenerated) => {
    let cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
    }

    cmp = mappingA.source - mappingB.source;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
        return cmp;
    }

    return mappingA.name - mappingB.name;
};

export const strcmp = (strA, strB) => {
    if (strA === strB) {
        return 0;
    }

    if (strA > strB) {
        return 1;
    }

    return -1;
};

export const compareByGeneratedPositionsInflated = (mappingA, mappingB) => {
    let cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
        return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
        return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
};

export const search = (
    haystack,
    needle,
    comparator,
    bias = util.binarySearch.GREATEST_LOWER_BOUND
) => {
    if (haystack.length === 0) {
        return -1;
    }

    let index = util.binarySearch(haystack, needle, -1, haystack.length, comparator, bias);
    if (index < 0) {
        return -1;
    }

    while (index - 1 >= 0) {
        if (comparator(haystack[index], haystack[index - 1], true) !== 0) {
            break;
        }
        --index;
    }

    return index;
};
