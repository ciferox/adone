const {
    application,
    runtime
} = adone;

const STATUS = {
    OFF: "off",
    ON: "on"
};

const STATUSES = [
    STATUS.OFF,
    STATUS.ON
];

const GATE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    requires: ["name", "port"],
    properties: {
        name: {
            type: "string"
        },
        port: {
            type: ["integer", "string"]
        },
        status: {
            type: "string",
            default: STATUS.ON,
            enum: STATUSES
        }
    }
};

export default class Gates extends application.Subsystem {
    async configure() {
        Object.assign(runtime.netron.options, this.parent.config.raw.netron);

        await runtime.netron.registerAdapter("ws", adone.netron.ws.Adapter);

        runtime.netron.on("peer online", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) connected`);
        }).on("peer offline", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) disconnected`);
        });

        const validator = new adone.schema.Validator({
            coerceTypes: true,
            useDefaults: true
        });
        this.validate = validator.compile(GATE_SCHEMA);

        adone.info("Gates subsystem configured");
    }

    async initialize() {
        this._servicePort = this.parent.config.getLocalGate().port;

        // Bind enabled gates.
        for (const gate of this.parent.config.getGates(STATUS.ON)) {
            await runtime.netron.bind(gate); // eslint-disable-line
        }

        adone.info("Gates subsystem initialized");
    }

    async uninitialize() {
        try {
            await runtime.netron.disconnect();
            await runtime.netron.unbind();

            // // Let netron gracefully complete all disconnects
            // await adone.promise.delay(500);
        } catch (err) {
            adone.error(err);
        }

        adone.info("Gates subsystem uninitialized");
    }

    getServicePort() {
        return this._servicePort;
    }

    addGate(gate) {
        if (!this.validate(gate)) {
            throw new adone.x.AggregateException(this.validate.errors);
        }

        return this.parent.config.addGate(gate);
    }

    deleteGate(name) {
        return this.parent.config.deleteGate(name);
    }

    async upGate(name) {
        const gate = this.parent.config.getGate(name);
        if (runtime.netron.gates.has(name)) {
            throw new adone.x.IllegalState(`Gate with name '${name}' already active`);
        }
        await runtime.netron.bind(gate);
    }

    async downGate(name) {
        if (name === "local") {
            throw new adone.x.NotAllowed("Down local gate is not allow");
        }

        // This call checks if gate is exist.
        const gate = this.parent.config.getGate(name);
        if (!runtime.netron.gates.has(name)) {
            throw new adone.x.IllegalState(`Gate with name '${name}' is not active`);
        }
        await runtime.netron.unbind(gate.name);
    }

    getGates({ active = false } = {}) {
        const allGates = this.parent.config.getGates();
        
        if (active) {
            const names = runtime.netron.gates.getAll().map((g) => g.name);
            return allGates.filter((g) => names.includes(g.name));
        }
        return allGates;
    }
    
    offGate(name) {
        return this.parent.config.disableGate(name);
    }

    onGate(name) {
        return this.parent.config.enableGate(name);
    }
}
