const {
    is,
    error,
    event: { AsyncEmitter }
} = adone;

const __ = adone.getPrivate(adone.netron);

export default class AbstractPeer extends AsyncEmitter {
    #interfaces = new Map();

    constructor({ netron } = {}) {
        super();

        this.netron = netron;
        this.task = {}; // task's results
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
        throw new adone.error.NotImplementedException("Method set() is not implemented");
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
        throw new adone.error.NotImplementedException("Method get() is not implemented");
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
     * Run one or more tasks on the side of associated netron and store results in 'task' property.
     * 
     * @param {string|object|array} task Name of the task, object{ name, ...args } or array of names|objects.
     * @returns {Promise<object>} Object where keys are names of tasks and values are objects with result or error.
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
        throw new adone.error.NotImplementedException("Method subscribe() is not implemented");
    }

    unsubscribe(/*eventName, handler*/) {
        throw new adone.error.NotImplementedException("Method unsubscribe() is not implemented");
    }

    /**
     * Attaches context to associated peer.
     * 
     * @param instance - context instance
     * @param ctxId - context identifier, if not specified, the class name will be used
     * @returns 
     */
    attachContext(/*instance, ctxId*/) {
        throw new adone.error.NotImplementedException("Method attachContext() is not implemented");
    }

    /**
     * Detaches before attached context with specified name.
     */
    detachContext(/*ctxId, releaseOriginated*/) {
        throw new adone.error.NotImplementedException("Method detachContext() is not implemented");
    }

    /**
     * Detaches all contexts.
     */
    detachAllContexts(/*releaseOriginated*/) {
        throw new adone.error.NotImplementedException("Method detachAllContexts() is not implemented");
    }

    hasContexts() {
        throw new adone.error.NotImplementedException("Method hasContexts() is not implemented");
    }

    hasContext(/*ctxId*/) {
        throw new adone.error.NotImplementedException("Method hasContext() is not implemented");
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
        if (!is.netronInterface(iInstance)) {
            throw new error.NotValidException("Object is not a netron interface");
        }
        this.#interfaces.delete(iInstance[__.I_DEFINITION_SYMBOL].id);
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
        throw new adone.error.NotImplementedException("Method _runTask() is not implemented");
    }

    _getContextDefinition(/*ctxId*/) {
        throw new adone.error.NotImplementedException("Method _getContextDefinition() is not implemented");
    }

    /**
     * Returns interface for context by definition id.
     * 
     * @param {number} defId 
     * @param {string|Identity|PeerInfo|Peer|nil} peerInfo 
     */
    _queryInterfaceByDefinition(/*defId*/) {
        throw new adone.error.NotImplementedException("Method _queryInterfaceByDefinition() is not implemented");
    }

    _addInterface(defId, iInstance) {
        this.#interfaces.set(defId, iInstance);
    }

    _getInterface(defId) {
        this.#interfaces.get(defId);
    }

    _hasInterface(defId) {
        this.#interfaces.has(defId);
    }

    _deleteInterface(defId) {
        this.#interfaces.delete(defId);
    }

    _deleteAllInterfaces() {
        this.#interfaces.clear();
    }

    // // _removeRelatedDefinitions(proxyDef) {
    // //     for (let [defId, def] of this._defs.entries()) {
    // //         if (is.propertyDefined(def, "$proxyDef") && def.$proxyDef === proxyDef) {
    // //             this._defs.delete(defId);
    // //         }
    // //     }
    // // }
}
