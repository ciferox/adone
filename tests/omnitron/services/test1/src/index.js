@adone.netron.meta.Context()
class Test1 {
    constructor(subsystem) {
        this.subsystem = subsystem;
    }

    @adone.netron.meta.Public()
    getInfo() {
        return {
            name: this.subsystem.name,
            group: this.subsystem.parent.group,
            pid: process.pid
        };
    }
}

export default class Test1Service extends adone.omnitron.Service {
    async initializeService() {
        this.context = new Test1(this);
        await this.peer.attachContext(this.context, "test1");
    }

    async uninitializeService() {
        await this.peer.detachContext("test1");
    }
}
