const {
    application,
    netron: { Context, Public },
    runtime
} = adone;

@Context()
class Payload {
    constructor(service) {
        this.service = service;
    }

    @Public()
    getInfo(options) {
        return this.service.getParent().getInfo(options);
    }
}

export default class extends application.Subsystem {
    async initialize() {
        const payload = new Payload(this);
        await runtime.netron.attachContext(payload, "payload");
    }

    async uninitialize() {
        await runtime.netron.detachContext("payload");
    }
}
