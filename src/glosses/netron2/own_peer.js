const {
    is,
    netron2: { AbstractPeer },
    x
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
            throw new x.NotExists(`Context with definition id '${defId}' not exists`);
        }
        return stub.set(name, data, this);
    }

    get(defId, name, defaultData) {
        const stub = this.netron._stubs.get(defId);
        if (is.undefined(stub)) {
            throw new x.NotExists(`Context with definition id '${defId}' not exists`);
        }
        return new Promise((resolve, reject) => {
            stub.get(name, defaultData, this).catch(reject).then((result) => {
                if (is.netron2Definition(result)) {
                    resolve(this.netron._createInterface(result, this));
                } else {
                    resolve(result);
                }
            });
        });
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

    getContextNames() {
        return this.netron.getContextNames();
    }

    getDefinitionByName(ctxId) {
        const stub = this.netron.contexts.get(ctxId);
        if (is.undefined(stub)) {
            throw new x.Unknown(`Unknown context '${ctxId}'`);
        }
        return stub.definition;
    }

    getInterfaceById(defId) {
        const stub = this.netron.getStubById(defId);
        return this.netron._createInterface(stub.definition, this);
    }    
}
adone.tag.add(OwnPeer, "NETRON2_OWNPEER");
