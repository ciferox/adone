const {
    is,
    netron2: { AbstractPeer },
    exception
} = adone;

export default class OwnPeer extends AbstractPeer {
    isConnected() {
        return true; // always connected
    }

    isNetronConnected() {
        return true; // always connected
    }

    set(defId, name, data) {
        const stub = this.netron._stubs.get(defId);
        if (is.undefined(stub)) {
            throw new exception.NotExists(`Context with definition id '${defId}' not exists`);
        }
        return stub.set(name, data, this);
    }

    async get(defId, name, defaultData) {
        const stub = this.netron._stubs.get(defId);
        if (is.undefined(stub)) {
            throw new exception.NotExists(`Context with definition id '${defId}' not exists`);
        }
        const result = await stub.get(name, defaultData, this);
        if (is.netron2Definition(result)) {
            return this.netron.interfaceFactory.create(result, this);
        }
        return result;
    }

    subscribe(eventName, handler, once = false) {
        return (once) ? this.netron.once(eventName, handler) : this.netron.addListener(eventName, handler);
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
        return this.netron._runPeerTask(this, task);
    }

    _getContextDefinition(ctxId) {
        const stub = this.netron.contexts.get(ctxId);
        if (is.undefined(stub)) {
            throw new exception.Unknown(`Unknown context '${ctxId}'`);
        }
        return stub.definition;
    }

    _queryInterfaceByDefinition(defId) {
        const stub = this.netron._getStub(defId);
        return this.netron.interfaceFactory.create(stub.definition, this);
    }
}
adone.tag.add(OwnPeer, "NETRON2_OWNPEER");
