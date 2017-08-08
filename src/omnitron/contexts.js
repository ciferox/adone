const { is } = adone;

export default class Contexts {
    constructor(omnitron) {
        this.omnitron = omnitron;
        this._cache = new Map();
        this._lazy = null;
    }

    async initialize() {
        const basePath = adone.std.path.join(__dirname, "contexts");
        const files = await adone.fs.readdir(basePath);
        const lazies = {};

        for (const file of files) {
            const extName = adone.std.path.extname(file);
            if (extName === "" || extName === ".js") {
                const name = adone.std.path.basename(file, ".js");
                lazies[name] = adone.std.path.join(basePath, name);
            }
        }

        this._lazy = adone.lazify(lazies, null, require);
    }

    async uninitialize() {
        for (const ctx of this._cache.values()) {
            if (is.function(ctx.uninitialize)) {
                // eslint-disable-next-line
                await ctx.uninitialize();
            }
        }
    }

    async get(name) {
        this._checkName(name);

        let context = this._cache.get(name);
        if (is.undefined(context)) {
            const Constructor = this._lazy[name];
            context = new Constructor(this.omnitron);
            if (is.function(context.initialize)) {
                await context.initialize();
            }
            this._cache.set(name, context);
        }

        return context;
    }

    getExport(name, exportName) {
        this._checkName(name);
    }

    _checkName(name) {
        if (!(name in this._lazy)) {
            throw new adone.x.Unknown(`Unknown context: ${name}`);
        }
    }
}
