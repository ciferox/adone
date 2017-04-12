const { is } = adone;
const { Contextable, Private, Public, Description, Method, Type } = adone.netron.decorator;

@Private
@Contextable
@Description("The valuable of vault")
@Method("set", { private: false })
@Method("get", { private: false })
@Method("type", { private: false })
@Method("has", { private: false })
@Method("delete", { private: false })
@Method("clear", { private: false })
@Method("keys", { private: false })
@Method("tags", { private: false })
@Method("addTag", { private: false })
@Method("deleteTag", { private: false })
class Valuable extends adone.vault.Valuable {
}

@Private
@Contextable
@Description("Omnitron vault")
@Method("get", { private: false, description: "Returns existing valuable", type: Object })
@Method("has", { private: false, description: "Checks whether valuable with specified name exists", type: Boolean })
@Method("delete", { private: false, description: "Deletes valuable", type: Boolean })
export default class Vault extends adone.vault.Vault {
    constructor(omnitron, options) {
        super(Object.assign({
            valuable: Valuable
        }, options));
        this.omnitron = omnitron;
    }
    
    @Public
    @Description("Returns existing valuable and create it if needed")
    @Type(Valuable)
    get(name) {
        if (this.has(name)) {
            return super.get(name);
        } else {
            return this.create(name);
        }
    }

    @Public
    @Description("Releases valuable")
    async release(name) {
        let valuable;
        if (is.vaultValuable(name)) {
            valuable = name;
        } else {
            valuable = await super.get();
        }
        super.release(valuable.name);
        return this.omnitron._.netron.releaseContext(valuable);
    }
}
