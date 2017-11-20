@adone.netron.Context()
class Test3 {
    constructor(subsystem) {
        this.subsystem = subsystem;
    }

    @adone.netron.Public()
    getInfo() {
        return this.subsystem.config;
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
