const {
    is,
    netron: { meta: { Context, Public } }
} = adone;

@Context()
class Test3 {
    constructor(service) {
        this.service = service;
    }

    @Public()
    check(name) {
        if (name !== this.service.name) {
            throw new adone.error.NotValid(`Invalid service name: ${this.service.name}`);
        }
        if (!is.netronPeer(this.service.peer)) {
            throw new adone.error.NotValid("Invalid service peer");
        }
    }

    @Public()
    async saveConfig() {
        const config = await this.service.getConfiguration();
        await config.set("key1", "adone");
        await config.set("key2", 888);
        await config.set("key3", new Date());
    }
}

export default class Test3Service extends adone.omnitron.Service {
    async initializeService() {
        this.context = new Test3(this);
        await this.peer.attachContext(this.context, "test3");
    }

    async uninitializeService() {
        await this.peer.detachContext("test3");
    }
}
