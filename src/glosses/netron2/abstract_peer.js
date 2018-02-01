const {
    is,
    exception,
    util,
    event: { AsyncEmitter },
    netron2: { RemoteStub }
} = adone;

const __ = adone.private(adone.netron2);

export default class AbstractPeer extends AsyncEmitter {
    constructor(info, netron) {
        super();

        this.info = info;
        this.netron = netron;
        this.interfaces = new Map();
        this.connectedTime = null;
        this.meta = new Map();

        // this.options = Object.assign({}, options);
        // this._defs = new Map();
        // this._ownDefIds = []; // super netron specific
    }

    /**
     * Checks peer is connected.
     */
    isConnected() {
        throw new adone.exception.NotImplemented("Method isConnected() is not implemented");
    }

    /**
     * Checks peer is connected using netron protocol.
     */
    isNetronConnected() {
        throw new adone.exception.NotImplemented("Method isNetronConnected() is not implemented");
    }

    /**
     * Sets value of property or calls method with 'name' in context with 'defId' on peer side identified by 'peerInfo'.
     * 
     * @param {string|PeerId|PeerInfo|nil} peerInfo - peer identity
     * @param {number} defId definition id
     * @param {string} name property name
     * @param {any} data property data
     * @returns {Promise<undefined>}
     */
    set(/*defId, name, data*/) {
        throw new adone.exception.NotImplemented("Method set() is not implemented");
    }

    /**
     * Gets value of property or calls method with 'name' in context with 'defId' on peer side identified by 'peerInfo'.
     * 
     * @param {string|PeerId|PeerInfo|nil} peerInfo - peer identity
     * @param {number} defId definition id
     * @param {string} name property name
     * @param {any} data property data
     * @returns {Promise<any>} returns property value or result of called method
     */
    get(/*defId, name, defaultData*/) {
        throw new adone.exception.NotImplemented("Method get() is not implemented");
    }

    /**
     * Alias for get() for calling methods.
     * 
     * @param {number} defId definition id
     * @param {string} name property name
     * @param {any} data property data
     * @returns {Promise<any>} returns property value or result of called method 
     */
    call(defId, method, ...args) {
        return this.get(defId, method, args);
    }

    /**
     * Alias for set() for calling methods.
     *
     * @param {number} defId definition id
     * @param {string} name property name
     * @param {any} data property data
     * @returns {Promise<undefined>} 
     */
    callVoid(defId, method, ...args) {
        return this.set(defId, method, args);
    }

    requestMeta(/*request*/) {
        throw new adone.exception.NotImplemented("Method requestMeta() is not implemented");
    }

    hasContexts() {
        throw new adone.exception.NotImplemented("Method hasContexts() is not implemented");
    }

    hasContext(/*ctxId*/) {
        throw new adone.exception.NotImplemented("Method hasContext() is not implemented");
    }

    /**
     * Attaches context to associated peer.
     * 
     * @param instance - context instance
     * @param ctxId - context identifier, if not specified, the class name will be used
     * @returns 
     */
    attachContext(/*instance, ctxId*/) {
        throw new adone.exception.NotImplemented("Method attachContext() is not implemented");
    }

    /**
     * Detaches before attached context with specified name.
     */
    detachContext(/*ctxId, releaseOriginated*/) {
        throw new adone.exception.NotImplemented("Method detachContext() is not implemented");
    }

    /**
     * Detaches all contexts.
     */
    detachAllContexts(/*releaseOriginated*/) {
        throw new adone.exception.NotImplemented("Method detachAllContexts() is not implemented");
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

    /**
     * Returns interface for context.
     * 
     * @param {string|nil} ctxId - context name
     */
    queryInterface(ctxId) {
        const def = this._getContextDefinition(ctxId);
        return this._queryInterfaceByDefinition(def.id);
    }

    /**
     * Removes interface from internal collections.
     * 
     * @param {Interface} iInstance 
     */
    releaseInterface(iInstance) {
        if (!is.netron2Interface(iInstance)) {
            throw new exception.NotValid("Object is not a netron interface");
        }
        this.interfaces.delete(iInstance[__.I_DEFINITION_SYMBOL].id);
    }

    _getContextDefinition(/*ctxId*/) {
        throw new adone.exception.NotImplemented("Method _getContextDefinition() is not implemented");
    }

    /**
     * Returns interface for context by definition id.
     * 
     * @param {number} defId 
     * @param {string|PeerId|PeerInfo|Peer|nil} peerInfo 
     */
    _queryInterfaceByDefinition(/*defId*/) {
        throw new adone.exception.NotImplemented("Method _queryInterfaceByDefinition() is not implemented");
    }

    // getNumberOfAwaiters() {
    //     return this._responseAwaiters.size;
    // }

    // onRemote(eventName, handler) {
    //     return this.netron.onRemote(this.uid, eventName, (peer, ...args) => handler(...args));
    // }

    // onContextAttach(handler) {
    //     return this.onRemote("context attach", handler);
    // }

    // onContextDetach(handler) {
    //     return this.onRemote("context detach", handler);
    // }

    // // _setStatus(status) {
    // //     if (status !== this._status) {
    // //         if (this._status === PEER_STATUS.ONLINE && status === PEER_STATUS.OFFLINE) {
    // //             for (const awaiter of this._responseAwaiters.values()) { // reject all the pending get requests
    // //                 awaiter([1, new exception.NetronPeerDisconnected()]);
    // //             }
    // //         }
    // //         this._status = status;
    // //         if (status === PEER_STATUS.OFFLINE) {
    // //             this._responseAwaiters.clear();
    // //         } else if (status === PEER_STATUS.ONLINE) {
    // //             this.connectedTime = new Date();
    // //             this.netron.peers.set(this.uid, this);
    // //         }
    // //         this.emit("status", status);
    // //     }
    // // }

    // _updateStrongDefinitions(defs) {
    //     for (const [ctxId, def] of util.entries(defs, { all: true })) {
    //         def.ctxId = ctxId;
    //         this._ctxidDefs.set(ctxId, def);
    //     }
    //     this._updateDefinitions(defs);
    // }

    // _updateDefinitions(defs) {
    //     for (const [, def] of util.entries(defs, { all: true })) {
    //         if (this.netron.options.acceptTwins === false) {
    //             delete def.twin;
    //         }
    //         this._defs.set(def.id, def);
    //     }
    // }

    // // _removeRelatedDefinitions(proxyDef) {
    // //     for (let [defId, def] of this._defs.entries()) {
    // //         if (is.propertyDefined(def, "$proxyDef") && def.$proxyDef === proxyDef) {
    // //             this._defs.delete(defId);
    // //         }
    // //     }
    // // }

    // /**
    //  * Method called when peer successfully connected to netron. Override this method allow custom handling of peer connection.
    //  */
    // async connected() {
    //     await this.onContextAttach((ctxData) => {
    //         const def = {};
    //         def[ctxData.id] = ctxData.def;
    //         this._updateStrongDefinitions(def);
    //     });

    //     await this.onContextDetach((ctxData) => {
    //         this._ctxidDefs.delete(ctxData.id);
    //         this._defs.delete(ctxData.defId);
    //     });
    // }

    // _processArgs(ctxDef, field, data) {
    //     if (ctxDef.$remote) {
    //         if (field.method) {
    //             this._processArgsRemote(data, true);
    //         } else {
    //             data = this._processArgsRemote(data, false);
    //         }
    //     }
    //     return data;
    // }

    // _processArgsRemote(args, isMethod) {
    //     if (isMethod && is.array(args)) {
    //         for (let i = 0; i < args.length; ++i) {
    //             args[i] = this._processObjectRemote(args[i]);
    //         }
    //     } else {
    //         return this._processObjectRemote(args);
    //     }
    // }

    // _processObjectRemote(obj) {
    //     if (is.netronDefinition(obj)) {
    //         const iCtx = this.netron._createInterface(obj, obj.$peer.uid);
    //         const stub = new RemoteStub(this.netron, iCtx);
    //         const def = stub.definition;
    //         obj.$remote = true;
    //         obj.$proxyDef = def;
    //         this.netron._proxifyContext(obj.id, stub);
    //         obj.$peer._updateDefinitions({ "": obj });
    //         return def;
    //     } else if (is.netronDefinitions(obj)) {
    //         for (let i = 0; i < obj.length; i++) {
    //             obj.set(i, this._processObjectRemote(obj.get(i)));
    //         }
    //     }
    //     return obj;
    // }

    // _processResult(ctxDef, result) {
    //     if (is.netronDefinition(result)) {
    //         this._updateDefinitions({ weak: result });
    //         if (ctxDef.$remote) {
    //             const iCtx = this.netron._createInterface(result, this.uid);
    //             const stub = new RemoteStub(this.netron, iCtx);
    //             const def = stub.definition;
    //             def.parentId = ctxDef.$proxyDef.id;
    //             result.$remote = true;
    //             result.$proxyDef = def;
    //             this.netron._proxifyContext(result.id, stub);
    //             return def;
    //         }
    //         return this.netron._createInterface(result, this.uid);

    //     } else if (is.netronDefinitions(result)) {
    //         for (let i = 0; i < result.length; i++) {
    //             result.set(i, this._processResult(ctxDef, result.get(i)));
    //         }
    //     }
    //     return result;
    // }
}
adone.tag.add(AbstractPeer, "NETRON2_ABSTRACTPEER");
