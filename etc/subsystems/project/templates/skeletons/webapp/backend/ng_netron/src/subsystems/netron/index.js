const {
    is,
    application,
    net,
    netron,
    omnitron
} = adone;

// Netron contexts
const contexts = adone.lazify({
    info: "./contexts/info"
}, null, require);

export default class extends application.Subsystem {
    constructor() {
        super();

        this.config = null;
        this.omniDispatcher = null;
        this.omnitronPeer = null;
        this.gateManager = null;
    }

    async initialize() {
        this.config = this.app._.config;

        if (is.plainObject(this.config.netron.omnitronGate) && is.exist(this.config.netron.omnitronGate.port)) {
            const gate = this.config.netron.omnitronGate;
            // Connect to omnitron
            this.omnitronPeer = await this.omniDispatcher.connect(gate);
            adone.info(`connected to omnitron gate '${gate.id}' (${net.util.humanizeAddr(gate.protocol, gate.port, gate.host)})`);
        }

        this.omniDispatcher = new omnitron.Dispatcher(this.app, { netronOptions: this.config.netron.options });

        for (const [name, Class] of Object.entries(contexts)) {
            const ctx = new Class(this.omniDispatcher);
            if (is.function(ctx.initialize)) {
                // eslint-disable-next-line
                await ctx.initialize();
            }
            this.omniDispatcher.netron.attachContext(ctx, name);
            adone.info(`context ${name} attached`);
        }

        this.omniDispatcher.bindGates(this.config.netron.gates, {
            adapters: {
                ws: netron.ws.Adapter
            }
        });

        adone.info("netron initialized");
    }

    async uninitialize() {
        const netron = this.omniDispatcher.netron;

        await netron.disconnect();
        await netron.unbind();

        adone.info("netron uninitialized");
    }
}
