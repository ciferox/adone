const { is } = adone;
const { Contextable, Private, Public, Description, Method, Type } = adone.netron.decorator;

// Host reserved properties:
// - name (String): hosts's IPv4/IPv6/domain
// - aliases (Array): list of host aliases
// - sshPort (Number): ssh port number
// - sshUser (String): ssh user
// - sshPassword (String): ssh password
// - sshPrivateKey (Buffer|String): content of ssh private key
// - omnitronPort (Number): netron port number
// - netronPrivateKey (Buffer|String): content of netron private key
// - country (String): host's country
// - countryCode (String): host's country two-chars code
// - systen (String): system short name (ubuntu, windows, freebsd, raspberry-pi, ...)
// - systemInfo (String): host's operating system info
// - notes (String): some additional information about host

const HOST_RESERVED_KEYS = [
    "name",
    "aliases",
    "sshPort",
    "sshUser",
    "sshPassword",
    "sshPrivateKey",
    "omnitronPort",
    "netronPrivateKey",
    "country",
    "countryCode",
    "systemInfo",
    "notes"
];

@Private
@Contextable
@Description("Host")
@Method("name", { private: false })
@Method("internalId", { private: false })
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
class Host extends adone.vault.Valuable {
}

const VAULT_OPTIONS = {
    valuable: Host
};

@Private
@Contextable
@Description("Hosts manager")
class Hosts {
    constructor(omnitron) {
        this.omnitron = omnitron;
        this._vault = null;
    }

    async initialize() {
        this._vault = await (await this.omnitron.context("vaults")).open("hosts", VAULT_OPTIONS);
    }

    async uninitialize() {
        await (await this.omnitron.context("vaults")).close("hosts");
    }

    @Public
    async add(id) {
        if (this._vault.has(id)) {
            throw new adone.x.Exists(`Already exists: '${id}'`);
        }
        const hosts = await this._vault.entries();
        for (const host of Object.values(hosts)) {
            if (host.has("aliases")) {
                const aliases = await host.get("aliases");
                if (aliases.includes(id)) {
                    throw new adone.x.Exists(`Already exists: '${id}'`);
                }
            }
        }
        return this._vault.create(id);
    }

    @Public
    async get(id) {
        if (this._vault.has(id)) {
            return this._vault.get(id);
        }
        const hosts = await this._vault.values();
        for (const host of hosts) {
            if (host.has("aliases")) {
                const aliases = await host.get("aliases");
                if (aliases.includes(id)) {
                    return host;
                }
            }
        }
        throw new adone.x.NotExists(`Not exists: '${id}'`);
    }

    @Public
    async delete(id) {
        if (this._vault.has(id)) {
            return this._vault.delete(id);
        }
        const hosts = await this._vault.entries();
        for (const [name, host] of Object.entries(hosts)) {
            adone.log(name);
            if (host.has("aliases")) {
                const aliases = await host.get("aliases");
                if (aliases.includes(id)) {
                    return this._vault.delete(name);
                }
            }
        }
        throw new adone.x.NotExists(`Not exists: '${id}'`);
    }

    @Public
    async addTag(newTag) {
        const result = await this._vault.addTag(newTag);
        if (is.null(result)) {
            throw new adone.x.Exists(`Tag already exists: ${adone.vault.normalizeTag(newTag).name}`);
        }
        return result;
    }

    @Public
    async deleteTag(tag) {
        const result = await this._vault.deleteTag(tag);
        if (!result) {
            throw new adone.x.NotExists(`Tag not exists: ${adone.vault.normalizeTag(tag).name}`);
        }
        return result;
    }

    @Public
    async deleteAllTags() {
        return this._vault.deleteAllTags();
    }

    @Public
    async tags(ids, options) {
        return this._vault.tags(ids, options);
    }

    @Public
    async list(options) {
        if (!is.string(options.format)) {
            options.format = "json";
        }

        let result;

        switch (options.format) {
            case "names": {
                const vals = await this._vault.values();
                result = [];
                for (const host of vals) {
                    let names;
                    if (host.has("aliases")) {
                        names = await host.get("aliases");
                    } else {
                        names = [];
                    }
                    names.unshift(host.name());
                    result.push(names);
                }
                break;
            }
            case "json": {
                result = await this._vault.toJSON(options);
            }
        }

        return result;
    }

    @Public
    clear(options) {
        return this._vault.clear(options);
    }
}

export default Hosts; // code generator fails when export + class decorator, todo: fix
