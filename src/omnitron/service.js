const {
    application: { STATE },
    is
} = adone;

const PEER_SYMBOL = Symbol.for("omnitron.Service#peer");
const CONFIGURATION_SYMBOL = Symbol();

export default class Service extends adone.application.Subsystem {
    constructor() {
        super();
        this[PEER_SYMBOL] = null;
        this[CONFIGURATION_SYMBOL] = null;
    }

    get peer() {
        return this[PEER_SYMBOL];
    }

    async getConfiguration() {
        if (is.null(this[CONFIGURATION_SYMBOL])) {
            this[CONFIGURATION_SYMBOL] = await this.parent.iMaintainer.getServiceConfiguration(this.name);
        }
        return this[CONFIGURATION_SYMBOL];
    }

    async configure() {
        await this.configureService();
        await this.configureSubsystems();
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.name,
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
            name: this.name,
            status: STATE.INITIALIZED
        });
    }

    /**
     * Initializes service.
     */
    initializeService() {
        throw new adone.error.NotImplemented("Method initialize() is not implemented");
    }

    async uninitialize() {
        await this.uninitializeService();
        await this.uninitializeSubsystems();
        this[PEER_SYMBOL] = null;
        this[CONFIGURATION_SYMBOL] = null;
        return this.parent.iMaintainer.notifyServiceStatus({
            name: this.name,
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
