const {
    is,
    module: { resolve },
    std: { module: NodeModule, path }
} = adone;

export default class Module extends NodeModule {
    #transform;

    constructor(id, { transform = null, parent = null } = {}) {
        super(id, parent);
        this.#transform = transform;
    }

    _compile(content, filename) {
        return this.#transform
            ? super._compile(this.#transform(content, filename), filename)
            : super._compile(content, filename);
    }

    require(id, { transform = this.#transform } = {}) {
        const filename = this.#resolveFilename(id);

        const cachedModule = NodeModule._cache[filename];
        if (cachedModule) {
            const children = this && this.children;
            if (children && !(children.includes(cachedModule))) {
                children.push(cachedModule);
            }
            return cachedModule.exports;
        }

        if (is.boolean(resolve.core[filename])) {
            return require(filename);
        }

        const module = new Module(filename, {
            parent: this,
            transform
        });
        NodeModule._cache[filename] = module;

        let threw = true;
        try {
            module.load(filename);
            threw = false;
        } finally {
            if (threw) {
                delete NodeModule._cache[filename];
            }
        }

        return module.exports;
    }

    uncache(id) {
        const filename = this.#resolveFilename(id);
        const visited = {};

        const mod = NodeModule._cache[filename];
        if (filename && (!is.undefined(mod))) {
            const run = (current) => {
                visited[current.id] = true;
                current.children.forEach((child) => {
                    if (path.extname(child.filename) !== ".node" && !visited[child.id]) {
                        run(child);
                    }
                });

                delete NodeModule._cache[current.id];
            };
            run(mod);
        }

        Object.keys(NodeModule._pathCache).forEach((cacheKey) => {
            if (cacheKey.indexOf(filename) > -1) {
                delete NodeModule._pathCache[cacheKey];
            }
        });
    }

    #resolveFilename(filename) {
        return resolve(filename, { basedir: path.dirname(this.id) });
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
