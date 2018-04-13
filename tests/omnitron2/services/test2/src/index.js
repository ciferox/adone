@adone.netron2.DContext()
class Test2 {
    constructor(subsystem) {
        this.subsystem = subsystem;
    }

    @adone.netron2.DPublic()
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
