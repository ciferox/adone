/* eslint-disable func-style */
const {
    is
} = adone;

const URL = require("./url");

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
export function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
        return aArgs[aName];
    } else if (arguments.length === 3) {
        return aDefaultValue;
    }
    throw new Error(`"${aName}" is a required argument.`);
}

function identity(s) {
    return s;
}

export const toSetString = identity;

export const fromSetString = identity;

function strcmp(aStr1, aStr2) {
    if (aStr1 === aStr2) {
        return 0;
    }

    if (is.null(aStr1)) {
        return 1; // aStr2 !== null
    }

    if (is.null(aStr2)) {
        return -1; // aStr1 !== null
    }

    if (aStr1 > aStr2) {
        return 1;
    }

    return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
export function compareByGeneratedPositionsInflated(mappingA, mappingB) {
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
}

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
export function parseSourceMapInput(str) {
    return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
}

// We use 'http' as the base here because we want URLs processed relative
// to the safe base to be treated as "special" URLs during parsing using
// the WHATWG URL parsing. This ensures that backslash normalization
// applies to the path and such.
const PROTOCOL = "http:";
const PROTOCOL_AND_HOST = `${PROTOCOL}//host`;

/**
 * Make it easy to create small utilities that tweak a URL's path.
 */
function createSafeHandler(cb) {
    return (input) => {
        const type = getURLType(input);
        const base = buildSafeBase(input);
        const url = new URL(input, base);

        cb(url);

        const result = url.toString();

        if (type === "absolute") {
            return result;
        } else if (type === "scheme-relative") {
            return result.slice(PROTOCOL.length);
        } else if (type === "path-absolute") {
            return result.slice(PROTOCOL_AND_HOST.length);
        }

        // This assumes that the callback will only change
        // the path, search and hash values.
        return computeRelativeURL(base, result);
    };
}

function withBase(url, base) {
    return new URL(url, base).toString();
}

function buildUniqueSegment(prefix, str) {
    let id = 0;
    do {
        const ident = prefix + (id++);
        if (!str.includes(ident)) {
            return ident;
        }
    } while (true);
}

function buildSafeBase(str) {
    const maxDotParts = str.split("..").length - 1;

    // If we used a segment that also existed in `str`, then we would be unable
    // to compute relative paths. For example, if `segment` were just "a":
    //
    //   const url = "../../a/"
    //   const base = buildSafeBase(url); // http://host/a/a/
    //   const joined = "http://host/a/";
    //   const result = relative(base, joined);
    //
    // Expected: "../../a/";
    // Actual: "a/"
    //
    const segment = buildUniqueSegment("p", str);

    let base = `${PROTOCOL_AND_HOST}/`;
    for (let i = 0; i < maxDotParts; i++) {
        base += `${segment}/`;
    }
    return base;
}

const ABSOLUTE_SCHEME = /^[A-Za-z0-9\+\-\.]+:/;
function getURLType(url) {
    if (url[0] === "/") {
        if (url[1] === "/") {
            return "scheme-relative";
        }
        return "path-absolute";
    }

    return ABSOLUTE_SCHEME.test(url) ? "absolute" : "path-relative";
}

/**
 * Given two URLs that are assumed to be on the same
 * protocol/host/user/password build a relative URL from the
 * path, params, and hash values.
 *
 * @param rootURL The root URL that the target will be relative to.
 * @param targetURL The target that the relative URL points to.
 * @return A rootURL-relative, normalized URL value.
 */
function computeRelativeURL(rootURL, targetURL) {
    if (is.string(rootURL)) {
        rootURL = new URL(rootURL); 
    }
    if (is.string(targetURL)) {
        targetURL = new URL(targetURL);
    }

    const targetParts = targetURL.pathname.split("/");
    const rootParts = rootURL.pathname.split("/");

    // If we've got a URL path ending with a "/", we remove it since we'd
    // otherwise be relative to the wrong location.
    if (rootParts.length > 0 && !rootParts[rootParts.length - 1]) {
        rootParts.pop();
    }

    while (
        targetParts.length > 0 &&
    rootParts.length > 0 &&
    targetParts[0] === rootParts[0]
    ) {
        targetParts.shift();
        rootParts.shift();
    }

    const relativePath = rootParts
        .map(() => "..")
        .concat(targetParts)
        .join("/");

    return relativePath + targetURL.search + targetURL.hash;
}

/**
 * Given a URL, ensure that it is treated as a directory URL.
 *
 * @param url
 * @return A normalized URL value.
 */
const ensureDirectory = createSafeHandler((url) => {
    url.pathname = url.pathname.replace(/\/?$/, "/");
});

/**
 * Given a URL, strip off any filename if one is present.
 *
 * @param url
 * @return A normalized URL value.
 */
const trimFilename = createSafeHandler((url) => {
    url.href = new URL(".", url.toString()).toString();
});

/**
 * Normalize a given URL.
 * * Convert backslashes.
 * * Remove any ".." and "." segments.
 *
 * @param url
 * @return A normalized URL value.
 */
export const normalize = createSafeHandler((url) => {});

/**
 * Joins two paths/URLs.
 *
 * All returned URLs will be normalized.
 *
 * @param aRoot The root path or URL. Assumed to reference a directory.
 * @param aPath The path or URL to be joined with the root.
 * @return A joined and normalized URL value.
 */
export function join(aRoot, aPath) {
    const pathType = getURLType(aPath);
    const rootType = getURLType(aRoot);

    aRoot = ensureDirectory(aRoot);

    if (pathType === "absolute") {
        return withBase(aPath, undefined);
    }
    if (rootType === "absolute") {
        return withBase(aPath, aRoot);
    }

    if (pathType === "scheme-relative") {
        return normalize(aPath);
    }
    if (rootType === "scheme-relative") {
        return withBase(aPath, withBase(aRoot, PROTOCOL_AND_HOST)).slice(PROTOCOL.length);
    }

    if (pathType === "path-absolute") {
        return normalize(aPath);
    }
    if (rootType === "path-absolute") {
        return withBase(aPath, withBase(aRoot, PROTOCOL_AND_HOST)).slice(PROTOCOL_AND_HOST.length);
    }

    const base = buildSafeBase(aPath + aRoot);
    const newPath = withBase(aPath, withBase(aRoot, base));
    return computeRelativeURL(base, newPath);
}

/**
 * Make a path relative to a URL or another path. If returning a
 * relative URL is not possible, the original target will be returned.
 * All returned URLs will be normalized.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 * @return A rootURL-relative (if possible), normalized URL value.
 */
export function relative(rootURL, targetURL) {
    const result = relativeIfPossible(rootURL, targetURL);

    return is.string(result) ? result : normalize(targetURL);
}

function relativeIfPossible(rootURL, targetURL) {
    const urlType = getURLType(rootURL);
    if (urlType !== getURLType(targetURL)) {
        return null;
    }

    const base = buildSafeBase(rootURL + targetURL);
    const root = new URL(rootURL, base);
    const target = new URL(targetURL, base);

    try {
        new URL("", target.toString());
    } catch (err) {
    // Bail if the URL doesn't support things being relative to it,
    // For example, data: and blob: URLs.
        return null;
    }

    if (
        target.protocol !== root.protocol ||
    target.user !== root.user ||
    target.password !== root.password ||
    target.hostname !== root.hostname ||
    target.port !== root.port
    ) {
        return null;
    }

    return computeRelativeURL(root, target);
}

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
export function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
    // The source map spec states that "sourceRoot" and "sources" entries are to be appended. While
    // that is a little vague, implementations have generally interpreted that as joining the
    // URLs with a `/` between then, assuming the "sourceRoot" doesn't already end with one.
    // For example,
    //
    //   sourceRoot: "some-dir",
    //   sources: ["/some-path.js"]
    //
    // and
    //
    //   sourceRoot: "some-dir/",
    //   sources: ["/some-path.js"]
    //
    // must behave as "some-dir/some-path.js".
    //
    // With this library's the transition to a more URL-focused implementation, that behavior is
    // preserved here. To acheive that, we trim the "/" from absolute-path when a sourceRoot value
    // is present in order to make the sources entries behave as if they are relative to the
    // "sourceRoot", as they would have if the two strings were simply concated.
    if (sourceRoot && getURLType(sourceURL) === "path-absolute") {
        sourceURL = sourceURL.replace(/^\//, "");
    }

    let url = normalize(sourceURL || "");

    // Parsing URLs can be expensive, so we only perform these joins when needed.
    if (sourceRoot) {
        url = join(sourceRoot, url); 
    }
    if (sourceMapURL) {
        url = join(trimFilename(sourceMapURL), url); 
    }
    return url;
}
