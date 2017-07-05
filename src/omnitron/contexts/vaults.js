const { is } = adone;
const { Contextable, Private, Public, Description, Method, Type } = adone.netron.decorator;

const SEPARATOR = "|";

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
@Method("toJSON", { private: false, description: "Returns valuable as json data", type: Object })
@Method("fromJSON", { private: false, description: "Update valuable within json data" })
@Method("tags", { private: false })
@Method("addTag", { private: false })
@Method("deleteTag", { private: false })
class Valuable extends adone.vault.Valuable {
}

export { Valuable }; // code generator fails when export + class decorator, todo: fix

@Private
@Contextable
@Description("Omnitron vault")
@Method("create", { private: false, description: "Creates new valuable", type: Valuable })
@Method("get", { private: false, description: "Returns existing valuable", type: Valuable })
@Method("has", { private: false, description: "Checks whether valuable with specified name exists", type: Boolean })
@Method("delete", { private: false, description: "Deletes valuable", type: Boolean })
@Method("toJSON", { private: false, description: "Returns array of valuables in json", type: Array })
@Method("getDescription", { private: false, description: "Returs description", type: String })
@Method("setDescription", { private: false, description: "Update description" })
class Vault extends adone.vault.Vault {
    constructor(omnitron, options) {
        super(Object.assign({
            ValuableClass: Valuable
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
class Vaults {
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
                return names.map((realName) => {
                    const parts = realName.split(SEPARATOR);
                    const name = parts[0];

                    return {
                        name,
                        path: adone.std.path.join(this._path, adone.std.path.dirname(realName)),
                        state: (opened.includes(realName) ? "open" : "close"),
                        encrypted: parts.length > 1 && parts.includes("crypt"),
                        size: 0
                    };
                });
            }
            case "open": {
                return [...this._vaults.entries()].map((v) => ({
                    name: v[0],
                    path: adone.std.path.dirname(v[1].vault.location()),
                    size: 0,
                    encrypted: is.plainObject(v[1].oprions.encryption)
                }));
            }
            case "close": {
                const opened = [...this._vaults.keys()];
                const names = await adone.fs.readdir(this._path);
                return names.filter((name) => !opened.includes(name.split(SEPARATOR)[0])).map((realName) => {
                    const parts = realName.split(SEPARATOR);
                    const name = parts[0];
                    return {
                        name,
                        path: adone.std.path.join(this._path, adone.std.path.dirname(realName)),
                        size: 0
                    };
                });
            }
        }
    }

    @Public
    @Description("Creates vault")
    @Type(Object)
    async create(name, options = {}) {
        let vault = this._vaults.get(name);
        if (!is.undefined(vault)) {
            throw new adone.x.Exists(`Vault '${name}' already exists`);
        }
        const location = this._location(name, options);
        const names = await adone.fs.readdir(this._path);
        const index = names.findIndex((fullName) => {
            const parts = fullName.split(SEPARATOR);
            return parts[0] === name;
        });
        if (index >= 0) {
            throw new adone.x.Exists(`Vault '${name}' already exists`);
        }
        options.location = location;
        vault = new Vault(this, options);
        await vault.open();
        await vault.close();

        return {
            name,
            path: this._path,
            state: "close",
            encrypted: is.plainObject(options.encryption),
            size: 0
        };
    }

    @Public
    @Description("Opens vault with specified name and returns it")
    @Type(Vault)
    async open(name, options = {}) {
        let vault = this._vaults.get(name);
        if (is.undefined(vault)) {
            delete options.location;
            vault = new Vault(this, Object.assign({
                location: this._location(name, options)
            }, options));
            this._vaults.set(name, {
                vault,
                options
            });
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
        const meta = this._vaults.get(name);
        if (is.undefined(meta)) {
            throw new adone.x.IllegalState(`Vault '${name}' is not opened`);
        }
        return meta.vault;
    }

    @Public
    @Description("Closes vault with specified name")
    async close(name) {
        const meta = this._vaults.get(name);
        if (is.undefined(meta)) {
            throw new adone.x.IllegalState(`Vault '${name}' is not opened`);
        }
        this._vaults.delete(name);
        return meta.vault.close();
    }

    @Public
    @Description("")
    async delete(name, { force = false } = {}) {
        const names = await adone.fs.readdir(this._path);
        const index = names.findIndex((fullName) => {
            const parts = fullName.split(SEPARATOR);
            return parts[0] === name;
        });
        if (index === -1) {
            throw new adone.x.NotExists(`Vault '${name}' not exists`);
        }
        const meta = this._vaults.get(name);
        if (!is.undefined(meta)) {
            if (force) {
                await this.close(name);
            } else {
                throw new adone.x.IllegalState(`Vault '${name}' is open`);
            }
        }
        return adone.fs.rm(adone.std.path.join(this._path, names[index]));
    }

    // format of directory/file name: <name>[<sep><opt[-value]>...]
    // options:
    // - crypt
    // - keyenc: any from db.level supported types
    // - valenc: any from db.level supported types
    _location(name, options) {
        let suffix = "";

        if (is.plainObject(options.encryption)) {
            suffix = `${SEPARATOR}crypt`;
        }
        return adone.std.path.join(this._path, `${name}${suffix}`);
    }
}

export default Vaults; // code generator fails when export + class decorator, todo: fix
