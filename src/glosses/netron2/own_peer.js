const {
    is,
    netron2: { BasePeer },
    x
} = adone;

export default class OwnPeer extends BasePeer {
    isConnected() {
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
                    resolve(this.netron._createInterface(result));
                } else {
                    resolve(result);
                }
            });
        });
    }

    ping() {
        return null;
    }

    hasContext(ctxId) {
        return this.netron.hasContext(ctxId);
    }

    /**
     * Only for compatibility.
     * 
     * @param {*} instance 
     * @param {*} ctxId 
     */
    attachContextRemote(instance, ctxId) {
        return this.netron.attachContext(instance, ctxId);
    }

    /**
     * Only for compatibility.
     * 
     * @param {*} instance 
     * @param {*} ctxId 
     */
    detachContextRemote(ctxId) {
        return this.netron.detachContext(ctxId);
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

    getInterface(ctxId) {
        return this.netron.getInterfaceByName(ctxId);
    }

    getInterfaceByName(ctxId) {
        return this.netron.getInterfaceByName(ctxId);
    }

    getInterfaceById(defId) {
        return this.netron.getInterfaceById(defId);
    }
}
adone.tag.add(OwnPeer, "NETRON2_OWNTPEER");
