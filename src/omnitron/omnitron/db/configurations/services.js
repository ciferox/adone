const {
    is,
    netron: { meta: { Context }, contextify },
    vault
} = adone;

const _CONFIGURATIONS = Symbol();

@Context({
    public: true,
    private: ["initialize", "uninitialize"],
    description: "Services configurations"
})
export default class Services extends vault.Valuable {
    /**
     * Returns contextable valuable with netron's network configuration.
     */
    async getServiceConfiguration(name) {
        let val = this[_CONFIGURATIONS].get(name);
        if (is.undefined(val)) {
            if (!this.has(name)) {
                await this.set(name, {});
            }
            val = contextify(this.slice(name));
            this[_CONFIGURATIONS].set(name, val);
        }
        return val;
    }

    initialize() {
        this[_CONFIGURATIONS] = new Map();
    }

    uninitialize() {
        this[_CONFIGURATIONS].clear();
    }
}    
