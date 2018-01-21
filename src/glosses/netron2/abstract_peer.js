const {
    is,
    x,
    util,
    event: { AsyncEmitter },
    collection: { TimedoutMap },
    netron2: { PEER_STATUS, ACTION, RemoteStub, SequenceId }
} = adone;

export default class AbstractPeer extends AsyncEmitter {
    constructor(info, netron) {
        super();
        this.info = info;
        this.netron = netron;

        // this.options = Object.assign({}, options);

        // this.streamId = new SequenceId();
        // this._responseAwaiters = new TimedoutMap(this.options.responseTimeout, (streamId) => {
        //     const awaiter = this._removeAwaiter(streamId);
        //     awaiter([1, new x.NetronTimeout(`Response timeout ${this.options.responseTimeout}ms exceeded`)]);
        // });
        // this._status = PEER_STATUS.OFFLINE;
        // this._defs = new Map();
        // this._ctxidDefs = new Map();
        // this._ownDefIds = []; // super netron specific

        // this.uid = null;
        // this.connectedTime = null;
    }

    getStatus() {
        return this._status;
    }

    set(defId, name, data) {
        throw new adone.x.NotImplemented("Method set() is not implemented");
    }

    get(defId, name, defaultData) {
        throw new adone.x.NotImplemented("Method get() is not implemented");
    }

    ping() {
        throw new adone.x.NotImplemented("Method ping() is not implemented");
    }

    hasContext(ctxId) {
        return this._ctxidDefs.has(ctxId);
    }

    waitForContext(ctxId) {
        return new Promise((resolve) => {
            if (this.hasContext(ctxId)) {
                resolve();
            } else {
                this.onContextAttach((ctxData) => {
                    if (ctxData.id === ctxId) {
                        resolve();
                    }
                });
            }
        });
    }

    attachContextRemote(instance, ctxId) {
        return this.netron.attachContextRemote(this.uid, instance, ctxId);
    }

    detachContextRemote(ctxId) {
        return this.netron.detachContextRemote(this.uid, ctxId);
    }

    getContextNames() {
        return Array.from(this._ctxidDefs.keys());
    }

    getDefinitionByName(/*ctxId*/) {
        throw new adone.x.NotImplemented("Method getDefinitionByName() is not implemented");
    }

    getInterface(ctxId) {
        return this.getInterfaceByName(ctxId);
    }

    getInterfaceByName(ctxId) {
        const def = this.getDefinitionByName(ctxId);
        if (is.undefined(def)) {
            throw new x.Unknown(`Unknown context '${ctxId}'`);
        }
        return this.getInterfaceById(def.id);
    }

    getInterfaceById(defId) {
        const def = this._defs.get(defId);
        if (is.undefined(def)) {
            throw new x.Unknown(`Unknown definition '${defId}'`);
        }
        return this.netron._createInterface(def, this.uid);
    }

    getNumberOfAwaiters() {
        return this._responseAwaiters.size;
    }

    onRemote(eventName, handler) {
        return this.netron.onRemote(this.uid, eventName, (peer, ...args) => handler(...args));
    }

    onContextAttach(handler) {
        return this.onRemote("context attach", handler);
    }

    onContextDetach(handler) {
        return this.onRemote("context detach", handler);
    }

    _setStatus(status) {
        if (status !== this._status) {
            if (this._status === PEER_STATUS.ONLINE && status === PEER_STATUS.OFFLINE) {
                for (const awaiter of this._responseAwaiters.values()) { // reject all the pending get requests
                    awaiter([1, new x.NetronPeerDisconnected()]);
                }
            }
            this._status = status;
            if (status === PEER_STATUS.OFFLINE) {
                this._responseAwaiters.clear();
            } else if (status === PEER_STATUS.ONLINE) {
                this.connectedTime = new Date();
                this.netron.peers.set(this.uid, this);
            }
            this.emit("status", status);
        }
    }

    _updateStrongDefinitions(defs) {
        for (const [ctxId, def] of util.entries(defs, { all: true })) {
            def.ctxId = ctxId;
            this._ctxidDefs.set(ctxId, def);
        }
        this._updateDefinitions(defs);
    }

    _updateDefinitions(defs) {
        for (const [, def] of util.entries(defs, { all: true })) {
            if (this.netron.options.acceptTwins === false) {
                delete def.twin;
            }
            this._defs.set(def.id, def);
        }
    }

    // _removeRelatedDefinitions(proxyDef) {
    //     for (let [defId, def] of this._defs.entries()) {
    //         if (is.propertyDefined(def, "$proxyDef") && def.$proxyDef === proxyDef) {
    //             this._defs.delete(defId);
    //         }
    //     }
    // }

    /**
     * Method called when peer successfully connected to netron. Override this method allow custom handling of peer connection.
     */
    async connected() {
        await this.onContextAttach((ctxData) => {
            const def = {};
            def[ctxData.id] = ctxData.def;
            this._updateStrongDefinitions(def);
        });

        await this.onContextDetach((ctxData) => {
            this._ctxidDefs.delete(ctxData.id);
            this._defs.delete(ctxData.defId);
        });
    }

    _setAwaiter(streamId, awaiter) {
        this._responseAwaiters.set(streamId, awaiter);
    }

    _removeAwaiter(streamId) {
        const awaiter = this._responseAwaiters.get(streamId);
        this._responseAwaiters.delete(streamId);
        return awaiter;
    }

    _processArgs(ctxDef, field, data) {
        if (ctxDef.$remote) {
            if (field.method) {
                this._processArgsRemote(data, true);
            } else {
                data = this._processArgsRemote(data, false);
            }
        }
        return data;
    }

    _processArgsRemote(args, isMethod) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                args[i] = this._processObjectRemote(args[i]);
            }
        } else {
            return this._processObjectRemote(args);
        }
    }

    _processObjectRemote(obj) {
        if (is.netronDefinition(obj)) {
            const iCtx = this.netron._createInterface(obj, obj.$peer.uid);
            const stub = new RemoteStub(this.netron, iCtx);
            const def = stub.definition;
            obj.$remote = true;
            obj.$proxyDef = def;
            this.netron._proxifyContext(obj.id, stub);
            obj.$peer._updateDefinitions({ "": obj });
            return def;
        } else if (is.netronDefinitions(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj.set(i, this._processObjectRemote(obj.get(i)));
            }
        }
        return obj;
    }

    _processResult(ctxDef, result) {
        if (is.netronDefinition(result)) {
            this._updateDefinitions({ weak: result });
            if (ctxDef.$remote) {
                const iCtx = this.netron._createInterface(result, this.uid);
                const stub = new RemoteStub(this.netron, iCtx);
                const def = stub.definition;
                def.parentId = ctxDef.$proxyDef.id;
                result.$remote = true;
                result.$proxyDef = def;
                this.netron._proxifyContext(result.id, stub);
                return def;
            }
            return this.netron._createInterface(result, this.uid);

        } else if (is.netronDefinitions(result)) {
            for (let i = 0; i < result.length; i++) {
                result.set(i, this._processResult(ctxDef, result.get(i)));
            }
        }
        return result;
    }
}
adone.tag.add(AbstractPeer, "NETRON2_ABSTRACTPEER");
