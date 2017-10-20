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
    async initialize() {
        this.context = new Test2(this);
        await this.peer.attachContextRemote(this.context, "test2");

        return super.initialize();
    }

    async uninitialize() {
        await this.peer.detachContextRemote("test2");

        return super.uninitialize();
    }
}
