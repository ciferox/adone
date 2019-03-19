const {
    is,
    error,
    netron: { Stub }
} = adone;

export default class StubManager {
    constructor(netron, { uid = new adone.netron.uid.FastUid() } = {}) {
        this.netron = netron;
        this.uid = uid;
        this.stubs = new Map();
        this.peerStubs = new Map();
    }

    /**
     * Creates new stub.
     * 
     * @param {context|reflection} obj
     * @returns {Stub}
     */
    createStub(obj) {
        return new Stub(this, obj);
    }

    /**
     * Creates new remote stub.
     */
    createRremoteStub() {

    }

    addStub(stub) {
        const defId = stub.definition.id;
        if (this.stubs.has(defId)) {
            throw new error.ExistsException(`Stub for definitiond with id=${this.uid.toString(defId)} already exists`);
        }
        this.stubs.set(defId, stub);
    }

    getStub(defId) {
        const stub = this.stubs.get(defId);
        if (is.undefined(stub)) {
            throw new error.NotExistsException(`Stub for definition with id='${defId}' not found`);
        }
        return stub;
    }

    deleteStubsForContext(obj, delOriginated = false) {
        for (const [defId, stub] of this.stubs.entries()) {
            if (stub.instance === obj) {
                this.deleteStub(defId, delOriginated);
            }
        }
    }

    deleteStub(defId, delOriginated = false) {
        this.stubs.delete(defId);
        if (delOriginated) {
            const defIds = [];
            const ignoreIds = [];
            this._deepScanChilds(defId, defIds, ignoreIds);
            for (const defId of defIds) {
                this.deleteStub(defId, true);
            }
        }
    }

    _deepScanChilds(parentId, defIds, ignoreIds) {
        for (const [defId, stub] of this.stubs.entries()) {
            if (ignoreIds.includes(defId)) {
                continue;
            }
            const def = stub.definition;
            if (def.parentId === parentId) {
                defIds.push(defId);
                ignoreIds.push(defId);
                this._deepScanChilds(defId, defIds, ignoreIds);
            }
        }
    }
}
