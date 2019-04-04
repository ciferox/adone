const {
    error,
    is,
    // js: { walk },
    realm: { code: { scope, Module } },
    util,
    std: { path }
} = adone;

export default class Sandbox {
    entries;

    #adonePath;

    #parserPlugins;

    #modulesCache = new Map();

    constructor({ cwd = process.cwd(), adonePath = adone.realm.rootRealm.cwd, input, parserPlugins } = {}) {
        this.#adonePath = adonePath;
        this.#parserPlugins = parserPlugins;

        this.cwd = cwd;
        const entries = util.arrify(input);
        if (entries.length === 0 || entries.filter((file) => is.string(file) && file.length).length === 0) {
            throw new error.NotValidException("Invalid input");
        }

        this.entries = entries.map((e) => path.join(cwd, e));

        this.globalScope = new scope.GlobalScope();
    }

    get adonePath() {
        return this.#adonePath;
    }

    async run() {
        for (const file of this.entries) {
            // eslint-disable-next-line no-await-in-loop
            await this.loadAndCacheModule(file);
        }
    }

    async loadAndCacheModule(modPath) {
        const realPath = adone.std.module._resolveFilename(modPath);
        let mod = this.#modulesCache.get(realPath);
        if (is.undefined(mod)) {
            mod = new Module({
                sandbox: this,
                file: realPath,
                parserPlugins: this.#parserPlugins
            });
            await mod.load();
            this.#modulesCache.set(realPath, mod);
        }

        return mod;
    }
}
