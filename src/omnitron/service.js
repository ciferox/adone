const {
    application: { STATE }
} = adone;

export default class Service extends adone.application.Subsystem {
    constructor({ config, peer } = {}) {
        super({
            name: config.name
        });
        this.peer = peer;
        this.config = config;
    }

    configure() {
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.config.name,
            status: STATE.CONFIGURED
        });
    }

    initialize() {
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.config.name,
            status: STATE.INITIALIZED
        });
    }

    uninitialize() {
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.config.name,
            status: STATE.UNINITIALIZED
        });
    }
}
adone.tag.add(Service, "OMNITRON_SERVICE");
