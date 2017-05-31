const { is, vendor: { lodash: _ } } = adone;
const { Contextable, Public, Private, Description, Type } = adone.netron.decorator;
const { ENABLED, ACTIVE } = adone.omnitron.const;

@Private
@Contextable
@Description("Manager os omnitron gates")
export default class GateManager extends adone.AsyncEmitter {
    constructor(gates, netron = null) {
        super();
        this.gates = gates;
        this.netron = netron;
    }

    setNetron(netron) {
        this.netron = netron;
    }

    async bindAll() {
        // Bind all gates.
        for (const gate of this.gates) {
            if (gate.status === ENABLED) {
                const bindOptions = this.getNetronOptions(gate);
                switch (gate.type) {
                    case "socket": {
                        await this.netron.bind(bindOptions);
                        gate.status = ACTIVE;
                        break;
                    }
                    case "websocket": {
                        const adapter = new adone.netron.ws.Adapter(bindOptions);
                        await this.netron.attachAdapter(adapter);
                        await this.netron.bind(gate.id);
                        gate.status = ACTIVE;
                        break;
                    }
                }
            }
        }
    }

    @Public
    @Type(Array)
    list() {
        return this.gates;
    }

    getNetronOptions(id) {
        return _.omit(this._findGate(id), ["type", "status"]);
    }

    setStatus(id, status) {
        this._findGate(id).status = status;
    }

    @Public
    @Description("Returns gate ")
    @Type(Object)
    getGate({ id = "local", type = null, status = null, contexts = null } = {}) {
        if (!is.undefined(id)) {
            for (const gate of this.gates) {
                if (id === gate.id) {
                    return gate;
                }
            }
            return;
        }
        const gates = [];
        for (const gate of this.gates) {
            if ((is.null(type) || type === gate.type) && (is.null(status) || status === gate.status)) {
                if (!is.array(contexts) || !is.plainObject(gate.access) || !is.array(gate.access.contexts)) {
                    gates.push(gate);
                } else {
                    for (const svcName of contexts) {
                        if (gate.access.contexts.includes(svcName)) {
                            gates.push(gate);
                        }
                    }
                }
            }
        }

        return gates;
    }

    _findGate(id) {
        let gate;
        if (is.plainObject(id) && is.propertyOwned(id, "id")) {
            gate = id;
        } else {
            gate = this.list().find((g) => g.id === id);
        }
        if (!is.plainObject(gate)) {
            throw new adone.x.Unknown(`Unknown gate: ${id}`);
        }
        return gate;
    }
}
