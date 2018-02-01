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
            return this.netron._createInterface(result, this);
        }
        return result;
    }

    async requestMeta(request) {
        const response = await this.netron.requestMeta(this, request);
        for (const res of response) {
            this.meta.set(res.id, adone.util.omit(res, "id"));
        }
        return response;
    }

    hasContexts() {
        return this.netron.hasContexts();
    }

    hasContext(ctxId) {
        return this.netron.hasContext(ctxId);
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

    getContextNames() {
        return this.netron.getContextNames();
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
        return this.netron._createInterface(stub.definition, this);
    }
}
adone.tag.add(OwnPeer, "NETRON2_OWNPEER");
