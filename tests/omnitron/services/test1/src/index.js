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
    async initialize() {
        this.context = new Test1(this);
        await this.peer.attachContextRemote(this.context, "test1");

        return super.initialize();
    }

    async uninitialize() {
        await this.peer.detachContextRemote("test1");

        return super.uninitialize();
    }
}
