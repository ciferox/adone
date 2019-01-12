const {
    is,
    error,
    event: { AsyncEmitter }
} = adone;

const __ = adone.private(adone.netron);

export default class AbstractPeer extends AsyncEmitter {
    constructor(info, netron) {
        super();

        this.info = info;
        this.netron = netron;
        this.interfaces = new Map();
        this.connectedTime = null;
        this.task = {}; // task's results

        // this.options = Object.assign({}, options);
    }

    get id() {
        return this.info.id.asBase58();
    }

    /**
     * Disconnects peer.
     */
    disconnect() {
        throw new adone.error.NotImplemented("Method disconnect() is not implemented");
    }

    /**
     * Checks peer is connected using netron protocol.
     */
    isConnected() {
        throw new adone.error.NotImplemented("Method isConnected() is not implemented");
    }

    /**
     * Sets value of property or calls method with 'name' in context with 'defId' on peer side identified by 'peerInfo'.
     * 
     * @param {string|Identity|PeerInfo|nil} peerInfo - peer identity
     * @param {number} defId definition id
     * @param {string} name property name
     * @param {any} data property data
     * @returns {Promise<undefined>}
     */
    set(/*defId, name, data*/) {
        throw new adone.error.NotImplemented("Method set() is not implemented");
    }

    /**
     * Gets value of property or calls method with 'name' in context with 'defId' on peer side identified by 'peerInfo'.
     * 
     * @param {string|Identity|PeerInfo|nil} peerInfo - peer identity
     * @param {number} defId definition id
     * @param {string} name property name
     * @param {any} data property data
     * @returns {Promise<any>} returns property value or result of called method
     */
    get(/*defId, name, defaultData*/) {
        throw new adone.error.NotImplemented("Method get() is not implemented");
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

    /**
     * Run one or more tasks on associated netron and store results in 'task' property.
     */
    async runTask(task) {
        const result = await this._runTask(task);
        Object.assign(this.task, result);
        for (const [task, info] of Object.entries(result)) {
            this.emit("task:result", task, info);
        }
        return result;
    }

    /**
     * Returns task result or adone.null if it not exists.
     * 
     * @param {string} name - task name
     */
    getTaskResult(name) {
        const taskObj = this.task[name];
        return taskObj ? taskObj.result : adone.null;
    }

    subscribe(/*eventName, handler*/) {
        throw new adone.error.NotImplemented("Method subscribe() is not implemented");
    }

    unsubscribe(/*eventName, handler*/) {
        throw new adone.error.NotImplemented("Method unsubscribe() is not implemented");
    }

    /**
     * Attaches context to associated peer.
     * 
     * @param instance - context instance
     * @param ctxId - context identifier, if not specified, the class name will be used
     * @returns 
     */
    attachContext(/*instance, ctxId*/) {
        throw new adone.error.NotImplemented("Method attachContext() is not implemented");
    }

    /**
     * Detaches before attached context with specified name.
     */
    detachContext(/*ctxId, releaseOriginated*/) {
        throw new adone.error.NotImplemented("Method detachContext() is not implemented");
    }

    /**
     * Detaches all contexts.
     */
    detachAllContexts(/*releaseOriginated*/) {
        throw new adone.error.NotImplemented("Method detachAllContexts() is not implemented");
    }

    hasContexts() {
        throw new adone.error.NotImplemented("Method hasContexts() is not implemented");
    }

    hasContext(/*ctxId*/) {
        throw new adone.error.NotImplemented("Method hasContext() is not implemented");
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
            throw new error.NotValid("Object is not a netron interface");
        }
        this.interfaces.delete(iInstance[__.I_DEFINITION_SYMBOL].id);
    }

    /**
     * Run one or more tasks on associated netron and store results in 'task' property.
     * 
     * This method should not be called directly.
     * 
     * Implementations os this method should never throw an error.
     * 
     * @param {string|array|object} task - task(s) description(s)
     */
    _runTask(/*task*/) {
        throw new adone.error.NotImplemented("Method _runTask() is not implemented");
    }

    _getContextDefinition(/*ctxId*/) {
        throw new adone.error.NotImplemented("Method _getContextDefinition() is not implemented");
    }

    /**
     * Returns interface for context by definition id.
     * 
     * @param {number} defId 
     * @param {string|Identity|PeerInfo|Peer|nil} peerInfo 
     */
    _queryInterfaceByDefinition(/*defId*/) {
        throw new adone.error.NotImplemented("Method _queryInterfaceByDefinition() is not implemented");
    }

    // // _removeRelatedDefinitions(proxyDef) {
    // //     for (let [defId, def] of this._defs.entries()) {
    // //         if (is.propertyDefined(def, "$proxyDef") && def.$proxyDef === proxyDef) {
    // //             this._defs.delete(defId);
    // //         }
    // //     }
    // // }
}
adone.tag.add(AbstractPeer, "NETRON2_ABSTRACTPEER");
