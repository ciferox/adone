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
    async initialize() {
        this.context = new Test3(this);
        await this.peer.attachContextRemote(this.context, "test3");

        return super.initialize();
    }

    async uninitialize() {
        await this.peer.detachContextRemote("test3");

        return super.uninitialize();
    }
}
