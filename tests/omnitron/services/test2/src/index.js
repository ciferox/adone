@adone.netron.meta.Context()
class Test2 {
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

export default class Test2Service extends adone.omnitron.Service {
    async initializeService() {
        this.context = new Test2(this);
        await this.peer.attachContext(this.context, "test2");
    }

    async uninitializeService() {
        await this.peer.detachContext("test2");
    }
}
