const {
    application: { STATE }
} = adone;

const PEER_SYMBOL = Symbol.for("omnitron.Service#peer");
const CONFIG_SYMBOL = Symbol.for("omnitron.Service#config");

export default class Service extends adone.application.Subsystem {
    constructor() {
        super();
        this[PEER_SYMBOL] = null;
        this[CONFIG_SYMBOL] = null;
    }

    get peer() {
        return this[PEER_SYMBOL];
    }

    get config() {
        return this[CONFIG_SYMBOL];
    }

    async configure() {
        await this.configureService();
        await this.configureSubsystems();
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.config.name,
            status: STATE.CONFIGURED
        });
    }

    /**
     * Configures service.
     */
    configureService() {
    }

    async initialize() {
        await this.initializeService();
        await this.initializeSubsystems();
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.config.name,
            status: STATE.INITIALIZED
        });
    }

    /**
     * Initializes service.
     */
    initializeService() {
        throw new adone.x.NotImplemented("Method initialize() is not implemented");
    }

    async uninitialize() {
        await this.uninitializeService();
        await this.uninitializeSubsystems();
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.config.name,
            status: STATE.UNINITIALIZED
        });
    }

    /**
     * Uninitializes service.
     */
    uninitializeService() {
    }
}
adone.tag.add(Service, "OMNITRON_SERVICE");
