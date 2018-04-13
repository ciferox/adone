const {
    application,
    netron2: { DContext, DPublic }
} = adone;

@DContext()
class Payload {
    constructor(service) {
        this.service = service;
    }

    @DPublic()
    getInfo(options) {
        return this.service.parent.getInfo(options);
    }
}

export default class extends application.Subsystem {
    async initialize() {
        const payload = new Payload(this);
        await this.root.netron.attachContext(payload, "payload");
    }

    async uninitialize() {
        await this.root.netron.detachContext("payload");
    }
}
