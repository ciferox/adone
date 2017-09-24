const NodeModule = adone.std.module;

const caller = () => {
    const origPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };
    const stack = (new Error()).stack;
    Error.prepareStackTrace = origPrepareStackTrace;
    return stack[2].getFileName();
};

export default class Module extends NodeModule {
    constructor(id, { transform = null, parent = null, loaders = {} } = {}) {
        super(id, parent);
        this.filename = id;
        this.transform = transform;
        this.loaders = loaders;
        this.cache = parent ? parent.cache : new Map();
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

    require(path, { cache = true } = {}) {
        if (!adone.is.string(path)) {
            throw new adone.x.InvalidArgument("`path` should be a string");
        }
        return this.constructor._load(path, this, cache);
    }


    static resolve(request, { basedir = caller() } = {}) {
        const m = new this(adone.std.path.join(basedir, "index.js"));
        return NodeModule._resolveFilename(request, m, false);
    }

    static _createNewModule(filename, parent) {
        return new this(filename, {
            parent,
            transform: parent.transform,
            loaders: parent.loaders
        });
    }

    static _load(request, parent, cache = true) {
        const filename = NodeModule._resolveFilename(request, parent, false);

        const cachedModule = parent.cache.get(filename);
        if (cachedModule) {
            return cachedModule.exports;
        }

        if (filename in adone.std) {
            return adone.std[filename];
        }

        const module = this._createNewModule(filename, parent);

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
