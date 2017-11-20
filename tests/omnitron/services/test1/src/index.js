@adone.netron.Context()
class Test1 {
    constructor(subsystem) {
        this.subsystem = subsystem;
    }

    @adone.netron.Public()
    getInfo() {
        return this.subsystem.config;
    }
}

export default class Test1Service extends adone.omnitron.Service {
    async initializeService() {
        this.context = new Test1(this);
        await this.peer.attachContextRemote(this.context, "test1");
    }

    async uninitializeService() {
        await this.peer.detachContextRemote("test1");
    }
}
