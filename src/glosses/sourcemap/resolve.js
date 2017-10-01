const {
    is,
    std
} = adone;

const sourceMappingURL = (() => {
    const innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/;

    const regex = RegExp(
        `${"(?:" +
        "/\\*" +
        "(?:\\s*\r?\n(?://)?)?" +
        "(?:"}${innerRegex.source})` +
        "\\s*" +
        "\\*/" +
        "|" +
        `//(?:${innerRegex.source})` +
        ")" +
        "\\s*"
    );

    return {

        regex,
        _innerRegex: innerRegex,

        getFrom(code) {
            const match = code.match(regex);
            return (match ? match[1] || match[2] || "" : null);
        },

        existsIn(code) {
            return regex.test(code);
        },

        removeFrom(code) {
            return code.replace(regex, "");
        },

        insertBefore(code, string) {
            const match = code.match(regex);
            if (match) {
                return code.slice(0, match.index) + string + code.slice(match.index);
            }
            return code + string;

        }
    };
})();

const normalizePath = (path) => std.path.sep === "\\" ? path.replace(/\\/, "/") : path;

const url = require("url");

const resolveUrl = (...urls) => urls.reduce((resolved, nextUrl) => url.resolve(resolved, nextUrl));

const callbackAsync = (callback, error, result) => {
    setImmediate(() => {
        callback(error, result);
    });
};

export const parseMapToJSON = (string, data) => {
    try {
        return JSON.parse(string.replace(/^\)\]\}'/, ""));
    } catch (error) {
        error.sourceMapData = data;
        throw error;
    }
};

const readSync = (read, url, data) => {
    try {
        return String(read(url));
    } catch (error) {
        error.sourceMapData = data;
        throw error;
    }
};

const dataUriRegex = /^data:([^,;]*)(;[^,;]*)*(?:,(.*))?$/;
const jsonMimeTypeRegex = /^(?:application|text)\/json$/;

const resolveSourceMapHelper = (code, codeUrl) => {
    codeUrl = normalizePath(codeUrl);

    const url = sourceMappingURL.getFrom(code);
    if (!url) {
        return null;
    }

    const dataUri = url.match(dataUriRegex);
    if (dataUri) {
        const mimeType = dataUri[1];
        const lastParameter = dataUri[2] || "";
        const encoded = dataUri[3] || "";
        const data = {
            sourceMappingURL: url,
            url: null,
            sourcesRelativeTo: codeUrl,
            map: encoded
        };
        if (!jsonMimeTypeRegex.test(mimeType)) {
            const error = new Error(`Unuseful data uri mime type: ${mimeType || "text/plain"}`);
            error.sourceMapData = data;
            throw error;
        }
        data.map = parseMapToJSON(
            lastParameter === ";base64" ? Buffer.from(encoded, "base64").toString("binary") : decodeURIComponent(encoded),
            data
        );
        return data;
    }

    const mapUrl = resolveUrl(codeUrl, url);
    return {
        sourceMappingURL: url,
        url: mapUrl,
        sourcesRelativeTo: mapUrl,
        map: null
    };
};

export const resolveSourceMap = (code, codeUrl, read, callback) => {
    let mapData;
    try {
        mapData = resolveSourceMapHelper(code, codeUrl);
    } catch (error) {
        return callbackAsync(callback, error);
    }
    if (!mapData || mapData.map) {
        return callbackAsync(callback, null, mapData);
    }
    read(mapData.url, (error, result) => {
        if (error) {
            error.sourceMapData = mapData;
            return callback(error);
        }
        mapData.map = String(result);
        try {
            mapData.map = parseMapToJSON(mapData.map, mapData);
        } catch (error) {
            return callback(error);
        }
        callback(null, mapData);
    });
};

export const resolveSourceMapSync = (code, codeUrl, read) => {
    const mapData = resolveSourceMapHelper(code, codeUrl);
    if (!mapData || mapData.map) {
        return mapData;
    }
    mapData.map = readSync(read, mapData.url, mapData);
    mapData.map = parseMapToJSON(mapData.map, mapData);
    return mapData;
};

const endingSlash = /\/?$/;

const resolveSourcesHelper = (map, mapUrl, options, fn) => {
    options = options || {};
    mapUrl = normalizePath(mapUrl);
    let fullUrl;
    let sourceContent;
    let sourceRoot;
    for (let index = 0, len = map.sources.length; index < len; index++) {
        sourceRoot = null;
        if (is.string(options.sourceRoot)) {
            sourceRoot = options.sourceRoot;
        } else if (is.string(map.sourceRoot) && options.sourceRoot !== false) {
            sourceRoot = map.sourceRoot;
        }
        // If the sourceRoot is the empty string, it is equivalent to not setting
        // the property at all.
        if (is.null(sourceRoot) || sourceRoot === "") {
            fullUrl = resolveUrl(mapUrl, map.sources[index]);
        } else {
            // Make sure that the sourceRoot ends with a slash, so that `/scripts/subdir` becomes
            // `/scripts/subdir/<source>`, not `/scripts/<source>`. Pointing to a file as source root
            // does not make sense.
            fullUrl = resolveUrl(mapUrl, sourceRoot.replace(endingSlash, "/"), map.sources[index]);
        }
        sourceContent = (map.sourcesContent || [])[index];
        fn(fullUrl, sourceContent, index);
    }
};

export const resolveSources = (map, mapUrl, read, options, callback) => {
    if (is.function(options)) {
        callback = options;
        options = {};
    }
    let pending = map.sources.length;
    const result = {
        sourcesResolved: [],
        sourcesContent: []
    };

    const done = function () {
        pending--;
        if (pending === 0) {
            callback(null, result);
        }
    };

    resolveSourcesHelper(map, mapUrl, options, (fullUrl, sourceContent, index) => {
        result.sourcesResolved[index] = fullUrl;
        if (is.string(sourceContent)) {
            result.sourcesContent[index] = sourceContent;
            callbackAsync(done, null);
        } else {
            read(fullUrl, (error, source) => {
                result.sourcesContent[index] = error ? error : String(source);
                done();
            });
        }
    });
};

export const resolveSourcesSync = (map, mapUrl, read, options) => {
    const result = {
        sourcesResolved: [],
        sourcesContent: []
    };
    resolveSourcesHelper(map, mapUrl, options, (fullUrl, sourceContent, index) => {
        result.sourcesResolved[index] = fullUrl;
        if (!is.null(read)) {
            if (is.string(sourceContent)) {
                result.sourcesContent[index] = sourceContent;
            } else {
                try {
                    result.sourcesContent[index] = String(read(fullUrl));
                } catch (error) {
                    result.sourcesContent[index] = error;
                }
            }
        }
    });
    return result;
};

export const resolve = (code, codeUrl, read, options, callback) => {
    if (is.function(options)) {
        callback = options;
        options = {};
    }

    const _resolveSources = (mapData) => {
        resolveSources(mapData.map, mapData.sourcesRelativeTo, read, options, (error, result) => {
            if (error) {
                return callback(error);
            }
            mapData.sourcesResolved = result.sourcesResolved;
            mapData.sourcesContent = result.sourcesContent;
            callback(null, mapData);
        });
    };

    if (is.null(code)) {
        const mapUrl = codeUrl;
        const data = {
            sourceMappingURL: null,
            url: mapUrl,
            sourcesRelativeTo: mapUrl,
            map: null
        };
        read(mapUrl, (error, result) => {
            if (error) {
                error.sourceMapData = data;
                return callback(error);
            }
            data.map = String(result);
            try {
                data.map = parseMapToJSON(data.map, data);
            } catch (error) {
                return callback(error);
            }
            _resolveSources(data);
        });
    } else {
        resolveSourceMap(code, codeUrl, read, (error, mapData) => {
            if (error) {
                return callback(error);
            }
            if (!mapData) {
                return callback(null, null);
            }
            _resolveSources(mapData);
        });
    }
};

export const resolveSync = (code, codeUrl, read, options) => {
    let mapData;
    if (is.null(code)) {
        const mapUrl = codeUrl;
        mapData = {
            sourceMappingURL: null,
            url: mapUrl,
            sourcesRelativeTo: mapUrl,
            map: null
        };
        mapData.map = readSync(read, mapUrl, mapData);
        mapData.map = parseMapToJSON(mapData.map, mapData);
    } else {
        mapData = resolveSourceMapSync(code, codeUrl, read);
        if (!mapData) {
            return null;
        }
    }
    const result = resolveSourcesSync(mapData.map, mapData.sourcesRelativeTo, read, options);
    mapData.sourcesResolved = result.sourcesResolved;
    mapData.sourcesContent = result.sourcesContent;
    return mapData;
};
