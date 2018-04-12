const {
    is,
    std: {
        module: NodeModule,
        path
    },
    collection,
    fs
} = adone;

const natives = process.binding("natives");
const preserveSymlinks = Boolean(process.binding("config").preserveSymlinks);

// In order to minimize unnecessary lstat() calls,
// this cache is a list of known-real paths.
// Set to an empty Map to reset.
// const realpathCache = new Map();

const toRealPath = (requestPath) => {
    return fs.realpathSync(requestPath/*, {
        [internalFS.realpathCacheKey]: realpathCache
    }*/);
};

const caller = () => {
    const origPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };
    const stack = (new Error()).stack;
    Error.prepareStackTrace = origPrepareStackTrace;
    return stack[2].getFileName();
};

const stat = (filename) => {
    filename = path._makeLong(filename);
    const cache = stat.cache;
    if (!is.null(cache)) {
        const result = cache.get(filename);
        if (!is.undefined(result)) {
            return result;
        }
    }
    let result;
    try {
        const stat = fs.statSync(filename);
        if (stat.isFile()) {
            result = 0;
        } else if (stat.isDirectory()) {
            result = 1;
        } else {
            result = -2; // ???
        }
    } catch (err) {
        result = -1;
    }
    if (!is.null(cache)) {
        cache.set(filename, result);
    }
    return result;
};
stat.cache = null;

// check if the directory is a package.json dir
const packageMainCache = Object.create(null);

const readPackage = (requestPath) => {
    const entry = packageMainCache[requestPath];
    if (entry) {
        return entry;
    }

    const jsonPath = path.resolve(requestPath, "package.json");

    let json;

    try {
        json = fs.readFileSync(path._makeLong(jsonPath), "utf8");
    } catch (err) {
        json = undefined;
    }

    if (is.nil(json)) {
        return false;
    }

    let pkg;

    try {
        pkg = packageMainCache[requestPath] = JSON.parse(json).main;
    } catch (e) {
        e.path = jsonPath;
        e.message = `Error parsing ${jsonPath}: ${e.message}`;
        throw e;
    }
    return pkg;
};

// check if the file exists and is not a directory
// if using --preserve-symlinks and isMain is false,
// keep symlinks intact, otherwise resolve to the
// absolute realpath.
const tryFile = (requestPath, isMain) => {
    const rc = stat(requestPath);
    if (preserveSymlinks && !isMain) {
        return rc === 0 && path.resolve(requestPath);
    }
    return rc === 0 && toRealPath(requestPath);
};

// given a path, check if the file exists with any of the set extensions
const tryExtensions = (p, exts, isMain) => {
    for (let i = 0; i < exts.length; i++) {
        const filename = tryFile(p + exts[i], isMain);

        if (filename) {
            return filename;
        }
    }
    return false;
};

const tryPackage = (requestPath, exts, isMain) => {
    const pkg = readPackage(requestPath);

    if (!pkg) {
        return false;
    }

    const filename = path.resolve(requestPath, pkg);
    return tryFile(filename, isMain) ||
        tryExtensions(filename, exts, isMain) ||
        tryExtensions(path.resolve(filename, "index"), exts, isMain);
};

export default class Module extends NodeModule {
    constructor(id, { transform = null, parent = null, loaders = {} } = {}) {
        super(id, parent);
        this.filename = id;
        this.transform = transform;
        this.loaders = loaders;
        this.cache = parent ? parent.cache : new collection.RefcountedCache();
        this.paths = id ? NodeModule._nodeModulePaths(adone.std.path.dirname(id)) : [];
    }

    _compile(content, filename) {
        if (this.transform) {
            return super._compile(this.transform(content, filename), filename);
        }
        return super._compile(content, filename);
    }

    load(filename) {
        this.filename = filename;
        this.paths = NodeModule._nodeModulePaths(adone.std.path.dirname(filename));

        const extension = adone.std.path.extname(filename) || ".js";
        this.loadExtension(filename, extension);
        this.loaded = true;
    }

    loadExtension(filename, extension) {
        if (!NodeModule._extensions[extension] && !this.loaders[extension]) {
            extension = ".js";
        }
        if (extension === ".node" && !this.loaders[extension]) {
            // ...
            return this.exports = require(filename);
        }
        return (this.loaders[extension] || NodeModule._extensions[extension])(this, filename);
    }

    loadItself() {
        this.load(this.id);
        return this.exports;
    }

    require(path, { cache = true, transform = this.transform } = {}) {
        if (!adone.is.string(path)) {
            throw new adone.error.InvalidArgument("`path` should be a string");
        }
        return this.constructor._load(path, this, transform, cache);
    }

    /**
     * Dereferences self and all the children modules from the cache
     */
    unrefSelf() {
        for (const child of this.children) {
            child.unrefSelf();
        }
        this.cache.unref(this.filename);
    }

    /**
     * Dereferences the entire module tree for the given path
     */
    unref(path) {
        const m = this.cache.get(path);
        if (!m) {
            return;
        }
        m.unrefSelf();
    }

    static resolve(request, { basedir = caller() } = {}) {
        const m = new this(adone.std.path.join(basedir, "index.js"));
        return NodeModule._resolveFilename(request, m, false);
    }

    static _createNewModule(filename, parent, transform) {
        return new this(filename, {
            parent,
            transform,
            loaders: parent.loaders
        });
    }

    static _load(request, parent, transform, cache = true) {
        const filename = this._resolveFilename(request, parent, false);

        if (parent.cache.has(filename)) {
            const m = parent.cache.get(filename);
            if (!parent.children.includes(m)) {
                parent.cache.ref(filename);
                parent.children.push(m);
            }
            return m.exports;
        }

        if (filename in adone.std) {
            return adone.std[filename];
        }

        const module = this._createNewModule(filename, parent, transform);

        if (cache) {
            parent.cache.set(filename, module);
        }

        let threw = true;
        try {
            module.load(filename);
            threw = false;
        } finally {
            if (threw && cache) {
                parent.cache.delete(filename);
            }
        }

        return module.exports;
    }

    static _resolveFilename(request, parent, isMain) {
        if (natives.hasOwnProperty(request)) {
            return request;
        }

        const paths = this._resolveLookupPaths(request, parent, true);

        // look up the filename first, since that's the cache key.
        const filename = this._findPath(request, paths, isMain);
        if (!filename) {
            const err = new Error(`Cannot find module '${request}'`);
            err.code = "MODULE_NOT_FOUND";
            throw err;
        }
        return filename;
    }

    static _findPath(request, paths, isMain) {
        if (path.isAbsolute(request)) {
            paths = [""];
        } else if (!paths || paths.length === 0) {
            return false;
        }

        const cacheKey = `${request}\x00${
            paths.length === 1 ? paths[0] : paths.join("\x00")}`;
        const entry = this._pathCache[cacheKey];
        if (entry) {
            return entry;
        }

        let exts;
        const trailingSlash = request.length > 0 &&
            request.charCodeAt(request.length - 1) === 47/*/*/;

        // For each path
        for (let i = 0; i < paths.length; i++) {
            // Don't search further if path doesn't exist
            const curPath = paths[i];
            if (curPath && stat(curPath) < 1) {
                continue;
            }
            const basePath = path.resolve(curPath, request);
            let filename;

            const rc = stat(basePath);
            if (!trailingSlash) {
                if (rc === 0) { // File.
                    if (preserveSymlinks && !isMain) {
                        filename = path.resolve(basePath);
                    } else {
                        filename = toRealPath(basePath);
                    }
                } else if (rc === 1) { // Directory.
                    if (is.undefined(exts)) {
                        exts = Object.keys(this._extensions);
                    }
                    filename = tryPackage(basePath, exts, isMain);
                }

                if (!filename) {
                    // try it with each of the extensions
                    if (is.undefined(exts)) {
                        exts = Object.keys(this._extensions);
                    }
                    filename = tryExtensions(basePath, exts, isMain);
                }
            }

            if (!filename && rc === 1) { // Directory.
                if (is.undefined(exts)) {
                    exts = Object.keys(this._extensions);
                }
                filename = tryPackage(basePath, exts, isMain) ||
                    // try it with each of the extensions at "index"
                    tryExtensions(path.resolve(basePath, "index"), exts, isMain);
            }

            if (filename) {
                this._pathCache[cacheKey] = filename;
                return filename;
            }
        }
        return false;
    }
}

Module.transforms = {
    transpile: (options) => {
        options = Object.assign({}, options);
        const ErrorConstructor = options.Error || Error;
        delete options.Error;
        const transform = (content, filename) => {
            if (filename.includes("node_modules")) {
                return content;
            }
            if (adone.sourcemap.convert.getMapFileCommentRegex().test(content)) {
                // a source map exists, assume it has been transpiled
                return content;
            }
            if (!filename.endsWith(".js")) { // ??? without this it's impossible to transpile files with extensions other than '.js'.
                filename = `${filename}.js`;
            }
            options = Object.assign(options, { filename, sourceMaps: "both" });
            const { code, map } = adone.js.compiler.core.transform(content, options);
            if (map) {
                transform.sourceMaps.set(filename, { map, url: filename });
            }
            return code;
        };
        transform.sourceMaps = new Map();
        transform.retrieveMapHandler = (path) => {
            if (transform.sourceMaps.has(path)) {
                return transform.sourceMaps.get(path);
            }
        };
        if (ErrorConstructor[Symbol.for("sourceMaps")]) {
            ErrorConstructor[Symbol.for("sourceMaps")].retrieveMapHandlers.unshift(transform.retrieveMapHandler);
        }
        return transform;
    }
};
