const {
    error,
    is,
    fs,
    js: { parse },
    realm: { code },
    util,
    std: { path }
} = adone;
const { Module, DEFAULT_PARSER_PLUGINS } = code;

/**
 * Code sandbox.
 * 
 * `input` should be string or array of entries where first entry interpreted as main entry file.
 * As a rule, other files should be specified if they are somehow implicitly imported into the module.
 * 
 */
export default class Sandbox {
    entries;

    #adoneModuleName;

    #adonePath;
    #adoneLibPath;
    #adoneSrcPath;

    #parserPlugins;

    #modulesCache = new Map();

    constructor({ cwd = process.cwd(), adoneModuleName = "adone", adonePath = adone.realm.rootRealm.cwd, input, parserPlugins = DEFAULT_PARSER_PLUGINS } = {}) {
        this.#adonePath = adonePath;
        this.#adoneLibPath = path.join(adonePath, "lib");
        this.#adoneSrcPath = path.join(adonePath, "src");
        this.#adoneModuleName = adoneModuleName;
        this.#parserPlugins = parserPlugins;

        this.cwd = cwd;
        const entries = util.arrify(input);
        if (entries.length === 0 || entries.filter((file) => is.string(file) && file.length).length === 0) {
            throw new error.NotValidException("Invalid input");
        }

        this.entries = entries.map((e) => path.join(cwd, e));

        this.globalScope = new code.GlobalScope();
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

    loadFile(filePath) {
        return fs.readFile(filePath, { check: true, encoding: "utf8" });
    }

    parse(content, { sourceType = "module", plugins = this.#parserPlugins } = {}) {
        return parse(content, {
            sourceType,
            plugins
        });
    }

    async loadAndCacheModule(modPath) {
        const realPath = adone.module.resolve(modPath);
        let mod = this.#modulesCache.get(realPath);
        if (is.undefined(mod)) {
            mod = new Module({
                sandbox: this,
                file: realPath
            });
            await mod.load();

            this.#modulesCache.set(realPath, mod);
        }

        return mod;
    }

    isSpecialModule(basePath, name) {
        if (name.startsWith(".")) {
            const relPath = path.resolve(basePath, name);
            if (relPath === this.adonePath) {
                return true;
            }
        }
        return name === this.#adoneModuleName || name in adone.module.resolve.core;
    }

    fixPath(modPath) {
        if (modPath.startsWith(this.#adoneLibPath)) {
            return path.join(this.#adoneSrcPath, modPath.substr(this.#adoneLibPath.length));
        }   
        return modPath;
    }
}
