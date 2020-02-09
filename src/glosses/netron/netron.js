const {
    is,
    error,
    netron: { meta: { Reflection }, StubManager, OwnPeer },
    util
} = adone;


const __ = adone.getPrivate(adone.netron);

export default class Netron extends adone.event.AsyncEmitter {
    constructor({
        taskManager = new adone.task.TaskManager(),
        responseTimeout = 60000 * 3,
        proxifyContexts = false,
        uid
    } = {}) {
        super();

        this.options = {
            responseTimeout,
            proxifyContexts
            // acceptTwins: true,
            // transpiler: {
            //     plugins: [
            //         "transform.asyncToGenerator"
            //     ],
            //     compact: false
            // },
        };

        this.peer = new OwnPeer({
            netron: this
        });
        this.peers = new Map();

        this.interfaceFactory = new __.InterfaceFactory(this);
        this.contexts = new Map();
        this._ownEvents = new Map();

        this.taskManager = taskManager;
        this.stubManager = new StubManager(this, { uid });

        // this._localTwins = new Map();

        this.setMaxListeners(Infinity);
    }

    refContext(peerId, obj) {
        let stubs = this.stubManager.peerStubs.get(peerId);
        if (is.undefined(stubs)) {
            stubs = [];
            this.stubManager.peerStubs.set(peerId, stubs);
        }
        let stub = stubs.find((s) => s.instance === obj);
        if (is.undefined(stub)) {
            stub = this.stubManager.createStub(obj);
            this.stubManager.addStub(stub);
            stubs.push(stub);
        }
        return stub.definition;
    }

    releaseContext(obj, releaseOriginated = true) {
        this.stubManager.deleteStubsForContext(obj, releaseOriginated);

        for (const [uid, stubs] of this.stubManager.peerStubs.entries()) {
            for (let i = 0; i < stubs.length; i++) {
                const stub = stubs[i];
                if (stub.instance === obj) {
                    stubs.splice(i, 1);
                    if (stubs.length === 0) {
                        this.stubManager.peerStubs.delete(uid);
                    }
                    break;
                }
            }
        }
    }

    /**
     * Attaches context to associated peer.
     * 
     * @param instance - context instance
     * @param ctxId - context identifier, if not specified, the class name will be used
     * @returns 
     */
    attachContext(instance, ctxId = null) {
        // Call this first because it validate instance.
        const r = Reflection.from(instance);

        if (is.null(ctxId)) {
            ctxId = instance.__proto__.constructor.name;
        }
        if (this.contexts.has(ctxId)) {
            throw new error.ExistsException(`Context '${ctxId}' already attached`);
        }

        return this._attachContext(ctxId, this.stubManager.createStub(r));
    }

    /**
     * Detaches before attached context with specified name.
     */
    detachContext(ctxId, releaseOriginated = true) {
        const stub = this.contexts.get(ctxId);
        if (is.undefined(stub)) {
            throw new error.NotExistsException(`Context '${ctxId}' not exists`);
        }

        this.contexts.delete(ctxId);
        const defId = stub.definition.id;
        this.stubManager.deleteStub(defId, releaseOriginated);
        this.emitSpecial("context:detach", `ctx:${ctxId}`, {
            id: ctxId,
            defId
        });
        return defId;
    }

    /**
     * Detaches all contexts.
     */
    detachAllContexts(releaseOriginated = true) {
        for (const ctxId of this.contexts.keys()) {
            this.detachContext(ctxId, releaseOriginated);
        }
    }

    hasContexts() {
        return this.contexts.size > 0;
    }

    hasContext(ctxId) {
        return this.contexts.has(ctxId);
    }

    getContextNames() {
        return [...this.contexts.keys()];
    }

    // setInterfaceTwin(ctxClassName, TwinClass) {
    //     if (!is.class(TwinClass)) {
    //         throw new error.InvalidArgumentException("TwinClass should be a class");
    //     }
    //     if (!is.netronInterface(new TwinClass())) {
    //         throw new error.InvalidArgumentException("TwinClass should be extended from adone.netron.Interface");
    //     }
    //     const Class = this._localTwins.get(ctxClassName);
    //     if (!is.undefined(Class)) {
    //         throw new error.ExistsException(`Twin for interface '${ctxClassName}' exists`);
    //     }
    //     this._localTwins.set(ctxClassName, TwinClass);
    // }

    // /**
    //  * Returns meta data.
    //  * 
    //  * @param {*} peer - instance of AbstractPeer implementation
    //  * @param {Array|Object|string} request
    //  */
    // async requestMeta(peer, request) {
    //     const response = [];
    //     const requests = util.arrify(request);

    //     for (let request of requests) {
    //         if (is.string(request)) {
    //             request = {
    //                 id: request
    //             };
    //         }
    //         try {
    //             const handler = this.getMetaHandler(request.id);
    //             const data = await handler(this, peer, request); // eslint-disable-line
    //             response.push({
    //                 id: request.id,
    //                 data
    //             });
    //         } catch (error) {
    //             response.push({
    //                 id: request.id,
    //                 error
    //             });
    //         }
    //     }

    //     return response;
    // }

    addPeer(peer) {
        const id = peer.id;
        if (this.peers.has(id)) {
            throw new error.ExistsException(`Peer with id '${id}' already exists`);
        }
        this.peers.set(id, peer);
    }

    deletePeer(p) {
        const peer = this.getPeer(p);
        return this.peers.delete(peer.id);
    }

    getPeer(something) {
        if (is.nil(something) || something === this.peer) {
            return this.peer;
        } else if (is.netronOwnPeer(something)) {
            throw new error.UnknownException("Unknown own peer");
        }

        let id;
        if (is.netronPeer(something)) {
            id = something.id;
            if (this.peers.has(id)) {
                return something;
            }
        } else if (is.peerInfo(something)) {
            id = something.id.toB58String();
        } else if (is.peerId(something)) {
            id = something.toB58String();
        } else if (is.string(something)) { // base58
            id = something;
        } else {
            throw new error.NotValidException(`Invalid type of peer identity: ${adone.typeOf(something)}`);
        }

        const peer = this.peers.get(id);
        if (is.undefined(peer)) {
            throw new error.UnknownException(`Unknown peer with id: '${id}'`);
        }
        return peer;
    }

    getPeerForInterface(iInstance) {
        if (!is.netronInterface(iInstance)) {
            throw new error.NotValidException("Object is not a netron interface");
        }

        return this.getPeer(iInstance[__.I_PEERID_SYMBOL]);
    }

    // // _removePeersRelatedDefinitions(exceptPeer, proxyDef) {
    // //     for (let peer of this.peers.values()) {
    // //         if (peer.uid !== exceptPeer.uid) {
    // //             peer._removeRelatedDefinitions(proxyDef);
    // //         }
    // //     }
    // // }

    addTask({ name, task, ...options } = {}) {
        if (is.class(task)) {
            if (!(task.prototype instanceof adone.task.IsomorphicTask)) {
                throw new error.NotValidException("Invalid task class. Task class should be inherited from adone.task.IsomorphicTask");
            }
        } else if (is.function(task)) {
            task = class extends adone.task.IsomorphicTask {
                main(...args) {
                    return task(...args);
                }
            };
        } else {
            throw new error.NotValidException("Invalid task. Task class should be function or class inherited from adone.task.IsomorphicTask");
        }
        return this.taskManager.addTask({ name, task, ...options });
    }

    /**
     * Runs task or tasks and return object with results.
     * 
     * Object passed to task as argument:
     * {
     *     peer,
     *     netron,
     *     args
     * }
     * @param {*} peer 
     * @param {*} task 
     */
    async runTask(peer, task) {
        // Normalize and validate tasks
        const tasks = util.arrify(task).map((val) => {
            if (is.string(val)) {
                return {
                    task: val
                };
            } else if (is.object(val)) {
                if (!is.string(val.task)) {
                    throw new error.NotValidException("Missing task property");
                }
                return val;
            }
            throw new error.NotValidExeception(`Invalid type of task: ${adone.typeOf(val)}`);
        });
        const tasksResults = {};
        const promises = [];

        for (const t of tasks) {
            if (!this.taskManager.hasTask(t.task)) {
                if (t.task in adone.netron.task) {
                    // eslint-disable-next-line
                    await this.taskManager.addTask({
                        name: t.task,
                        task: adone.netron.task[t.task],
                        singleton: true
                    });
                } else {
                    tasksResults[t.task] = {
                        error: new error.NotExistsException(`Task '${t.task}' not exists`)
                    };
                    continue;
                }
            }
            let r;
            try {
                // eslint-disable-next-line no-await-in-loop
                const observer = await this.taskManager.run(t.task, {
                    netron: this,
                    peer,
                    args: util.arrify(t.args)
                }); // eslint-disable-line
                r = is.promise(observer.result)
                    ? observer.result
                    : Promise.resolve(observer.result);
            } catch (err) {
                r = Promise.reject(err);
            }

            promises.push(r.then((result) => {
                tasksResults[t.task] = {
                    result
                };
            }).catch((error) => {
                // console.log(error);
                tasksResults[t.task] = {
                    error
                };
            }));
        }

        await Promise.all(promises);
        return tasksResults;
    }

    deleteSpecialEvents(id) {
        this._ownEvents.delete(id);
    }

    async emitSpecial(event, id, data) {
        let events = this._ownEvents.get(id);
        if (is.undefined(events)) {
            events = [event];
            this._ownEvents.set(id, events);
        } else {
            events.push(event);
            if (events.length > 1) {
                return;
            }
        }
        for (; ;) {
            const eventName = events[0];
            if (is.undefined(eventName)) {
                break;
            }
            try {
                // TODO: deadlock issue
                await this.emitParallel(eventName, data); // eslint-disable-line
            } catch (err) {
                console.error(adone.pretty.error(err));
            }

            if (is.undefined(events.shift())) {
                break;
            }
        }
    }

    _attachContext(ctxId, stub) {
        const def = stub.definition;
        this.contexts.set(ctxId, stub);
        this.stubManager.addStub(stub);
        this.emitSpecial("context:attach", `ctx:${ctxId}`, {
            id: ctxId,
            def
        });
        return def.id;
    }
}
