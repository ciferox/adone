const {
    GenesisPeer,
    STATUS
} = adone.netron;

export default class OwnPeer extends GenesisPeer {
    constructor(options) {
        super(options);
        this.uid = this.netron.uid;
    }

    isConnected() {
        return true; // always connected
    }

    getStatus() {
        return STATUS.ONLINE;
    }

    set(defId, name, data) {
        return this.netron.set(null, defId, name, data);
    }

    get(defId, name, defaultData) {
        return this.netron.get(null, defId, name, defaultData);
    }

    ping() {
        return this.netron.ping();
    }

    attachContextRemote(instance, ctxId) {
        return this.netron.attachContext(instance, ctxId);
    }

    detachContextRemote(ctxId) {
        return this.netron.detachContext(ctxId);
    }

    getContextNames() {
        return this.netron.getContextNames();
    }

    getDefinitionByName(ctxId) {
        return this.netron.getDefinitionByName(ctxId);
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
adone.tag.add(OwnPeer, "NETRON_OWNPEER");
