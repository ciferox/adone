const {
    is,
    module: { resolve },
    std: { module: NodeModule, path }
} = adone;

export default class Module extends NodeModule {
    constructor(id, { parent = null, transforms = [] } = {}) {
        super(id, parent);
        this.transforms = transforms;
    }

    addTransform(fn) {
        if (!is.function(fn)) {
            throw new error.InvalidArgumentException(`Transform must be a function`);
        }
        this.transforms.push(fn);
        return this;
    }

    _compile(content, filename) {
        for (const t of this.transforms) {
            content = t(this, content, filename);
        }
        super._compile(content, filename);
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
            parent: this,
            transforms: this.transforms
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
