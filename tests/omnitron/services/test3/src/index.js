const {
    is,
    netron: { Context, Public }
} = adone;

@Context()
class Test3 {
    constructor(service) {
        this.service = service;
    }

    @Public()
    check(name) {
        if (name !== this.service.getName()) {
            throw new adone.x.NotValid(`Invalid service name: ${this.service.getName()}`);
        }
        if (!is.netronPeer(this.service.peer)) {
            throw new adone.x.NotValid("Invalid service peer");
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
        await this.peer.attachContextRemote(this.context, "test3");
    }

    async uninitializeService() {
        await this.peer.detachContextRemote("test3");
    }
}
