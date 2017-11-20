@adone.netron.Context()
class Test2 {
    constructor(subsystem) {
        this.subsystem = subsystem;
    }

    @adone.netron.Public()
    getInfo() {
        return this.subsystem.config;
    }
}

export default class Test2Service extends adone.omnitron.Service {
    async initializeService() {
        this.context = new Test2(this);
        await this.peer.attachContextRemote(this.context, "test2");
    }

    async uninitializeService() {
        await this.peer.detachContextRemote("test2");
    }
}
