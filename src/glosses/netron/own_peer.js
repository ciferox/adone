const {
    is,
    netron: { AbstractPeer },
    error
} = adone;

export default class OwnPeer extends AbstractPeer {
    constructor(options) {
        super(options);
        this.id = null;
    }

    set(defId, name, data) {
        const stub = this.netron.stubManager.getStub(defId);
        if (is.undefined(stub)) {
            throw new error.NotExistsException(`Context with definition id '${defId}' not exists`);
        }
        return stub.set(name, data, this);
    }

    async get(defId, name, defaultData) {
        const stub = this.netron.stubManager.getStub(defId);
        if (is.undefined(stub)) {
            throw new error.NotExistsException(`Context with definition id '${defId}' not exists`);
        }
        const result = await stub.get(name, defaultData, this);
        if (is.netronDefinition(result)) {
            return this.netron.interfaceFactory.create(result, this);
        }
        return result;
    }

    subscribe(eventName, handler, once = false) {
        return once
            ? this.netron.once(eventName, handler)
            : this.netron.addListener(eventName, handler);
    }

    unsubscribe(eventName, handler) {
        return this.netron.removeListener(eventName, handler);
    }

    attachContext(instance, ctxId) {
        return this.netron.attachContext(instance, ctxId);
    }

    detachContext(ctxId, releaseOriginated) {
        return this.netron.detachContext(ctxId, releaseOriginated);
    }

    detachAllContexts(releaseOriginated) {
        return this.netron.detachAllContexts(releaseOriginated);
    }

    hasContexts() {
        return this.netron.hasContexts();
    }

    hasContext(ctxId) {
        return this.netron.hasContext(ctxId);
    }

    getContextNames() {
        return this.netron.getContextNames();
    }

    _runTask(task) {
        return this.netron.runTask(this, task);
    }

    _getContextDefinition(ctxId) {
        const stub = this.netron.contexts.get(ctxId);
        if (is.undefined(stub)) {
            throw new error.NotExistsException(`Context '${ctxId}' not exists`);
        }
        return stub.definition;
    }

    _queryInterfaceByDefinition(defId) {
        const stub = this.netron.stubManager.getStub(defId);
        return this.netron.interfaceFactory.create(stub.definition, this);
    }
}
