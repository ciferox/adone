const { is } = adone;
const { Contextable, Private, Public, Description, Method, Type } = adone.netron.decorator;

@Private
@Contextable
@Description("The valuable of vault")
@Method("set", { private: false })
@Method("setMulti", { private: false })
@Method("get", { private: false })
@Method("type", { private: false })
@Method("has", { private: false })
@Method("delete", { private: false })
@Method("clear", { private: false })
@Method("keys", { private: false })
@Method("entries", { private: false })
@Method("tags", { private: false })
@Method("addTag", { private: false })
@Method("deleteTag", { private: false })
export class Valuable extends adone.vault.Valuable {
}

@Private
@Contextable
@Description("Omnitron vault")
@Method("create", { private: false, description: "Creates new valuable", type: Valuable })
@Method("get", { private: false, description: "Returns existing valuable", type: Valuable })
@Method("has", { private: false, description: "Checks whether valuable with specified name exists", type: Boolean })
@Method("delete", { private: false, description: "Deletes valuable", type: Boolean })
class Vault extends adone.vault.Vault {
    constructor(omnitron, options) {
        super(Object.assign({
            valuable: Valuable
        }, options));
        this.omnitron = omnitron;
    }

    @Public
    @Description("Returns existing valuable and create it if needed")
    @Type(Valuable)
    getOrCreate(name) {
        if (this.has(name)) {
            return super.get(name);
        }
        return this.create(name);

    }

    @Public
    @Description("Releases valuable")
    async release(name) {
        let valuable;
        if (is.vaultValuable(name)) {
            valuable = name;
        } else {
            valuable = await super.get(name);
        }
        super.release(valuable.name);
        return this.omnitron._.netron.releaseContext(valuable);
    }
}

@Private
@Contextable
@Description("Vault manager")
export default class Vaults {
    constructor(omnitron) {
        this.omnitron = omnitron;
        this._vaults = new Map();
    }

    async initialize() {
        this._path = this.omnitron.config.omnitron.vaultsPath;
        await adone.fs.mkdir(this._path);
    }

    async uninitialize() {
        // Close opened vaults
        for (const vault of this._vaults.values()) {
            await vault.close();
        }
    }

    @Public
    @Description("List vaults")
    @Type(Array)
    async list({ state = "all" }) {
        switch (state) {
            case "all": {
                const opened = [...this._vaults.keys()];
                const names = await adone.fs.readdir(this._path);
                return names.map((name) => ({
                    name,
                    path: adone.std.path.join(this._path, name),
                    state: (opened.includes(name) ? "open" : "close"),
                    size: 0
                }));
            }
            case "opened": {
                return [...this._vaults.entries()].map((v) => ({
                    name: v.name,
                    path: v.location(),
                    size: 0
                }));
            }
            case "closed": {
                const opened = [...this._vaults.keys()];
                const names = await adone.fs.readdir(this._path);
                return names.filter((name) => !opened.includes(name)).map((name) => ({
                    name,
                    path: adone.std.path.join(this._path, name),
                    size: 0
                }));
            }
        }
    }

    @Public
    @Description("Opens vault with specified name and returns it")
    @Type(Vault)
    async open(name, options = {}) {
        const location = this._location(name);
        let vault = this._vaults.get(location);
        if (is.undefined(vault)) {
            delete options.location;
            vault = new Vault(this, Object.assign({
                location
            }, options));
            this._vaults.set(location, vault);
        } else {
            throw new adone.x.IllegalState(`Vault '${name}' already opened`);
        }

        await vault.open();
        return vault;
    }

    @Public
    @Description("Returns opened vault with specified name")
    @Type(Vault)
    async get(name) {
        const vault = this._get(name);
        if (is.undefined(vault)) {
            throw new adone.x.IllegalState(`Vault '${name}' is not opened`);
        }
        return vault;
    }

    @Public
    @Description("Closes vault with specified name")
    @Type()
    async close(name) {
        const location = this._location(name);
        const vault = this._vaults.get(location);
        if (is.undefined(vault)) {
            throw new adone.x.IllegalState(`Vault '${name}' is not opened`);
        }

        this._vaults.delete(location);
        return vault.close();
    }

    _get(name) {
        const location = this._location(name);
        return this._vaults.get(location);
    }

    _location(name) {
        return adone.std.path.join(this._path, name);
    }
}
