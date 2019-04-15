const {
    is,
    module: { resolve, babelTransform, COMPILER_PLUGINS },
    std: { module: NodeModule, path }
} = adone;

export default class Module extends NodeModule {
    #transform = null;

    constructor(id, { parent = null } = {}) {
        super(id, parent);
        this.#transform = babelTransform({
            compact: false,
            only: [/\.js$/],
            sourceMaps: "inline",
            plugins: COMPILER_PLUGINS
        });
    }

    _compile(content, filename) {
        // console.log(is.function(this.#transform));
        // return this.#transform
            // ?
             super._compile(this.#transform(content, filename), filename)
            // : super._compile(content, filename);
    }

    require(id) {
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
            parent: this 
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
