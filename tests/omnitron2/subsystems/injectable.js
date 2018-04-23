const {
    application,
    netron2: { meta: { Context, Public } }
} = adone;

@Context()
class Payload {
    constructor(service) {
        this.service = service;
    }

    @Public()
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
