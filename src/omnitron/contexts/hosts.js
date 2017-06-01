const { is } = adone;
const { Contextable, Private, Public, Description, Method, Type } = adone.netron.decorator;

// Host available properties:
// - ip4 (String): IPv4 address of host
// - ip6 (String): IPv6 address of host
// - comment (String): some additional information about host
// - groups (Array): list of host's groups
// - aliases (Array): list of host aliaces
// - sshPort (Number): ssh port number
// - sshUser (String): ssh user
// - sshPassword (String): ssh password
// - sshPrivateKey (String): path of ssh private key
// - sshOptions (Object): ssh client options
// - netronPort (Number): netron port number
// - netronPrivateKey (String): path of netron private key
// - netronOptions (Object): netron client options.

const HOST_KEYS = [
    "ip4",
    "ip6",
    "comment",
    "groups",
    "aliaces",
    "sshPort",
    "sshUser",
    "sshPassword",
    "sshPrivateKey",
    "sshOptions",
    "netronPort",
    "netronPrivateKey",
    "netronOptions"
];

@Private
@Contextable
@Description("Host")
@Method("name", { private: false })
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
export default class Hosts {
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
    async tags() {
        return this._vault.tags();
    }

    @Public
    async list() {
        const entries = await this._vault.entries();
        const result = [];
        for (const [name, host] of Object.entries(entries)) {
            result.push(await this._getNames(host));
        }
        return result;
    }

    @Public
    async listGroups() {
        const groups = await this._vault.tags();
        const hosts = await this._vault.values();
        const result = {};
        for (const group of groups) {
            result[group] = [];
            for (const host of hosts) {
                if (host.hasTag(group)) {
                    result[group].push(await this._getNames(host));
                }
            }
        }

        return result;
    }

    async _getNames(host) {
        const name = host.name();
        if (host.has("aliases")) {
            return [name].concat(await host.get("aliases")).join(", ");
        } 
        return name;
        
    }
}
