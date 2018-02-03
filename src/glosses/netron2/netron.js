const {
    is,
    exception,
    util,
    net: { p2p: { PeerInfo } },
    netron2: { Reference, Definitions, Reflection, Stub, FastUniqueId, OwnPeer, ACTION },
    tag
} = adone;

const CONNECT_TASKS = ["config", "contextDefs"];

const __ = adone.private(adone.netron2);

const normalizeError = (err) => {
    let normErr;
    if (is.knownError(err)) {
        normErr = err;
    } else {
        normErr = new Error(err.message);
        normErr.stack = err.stack;
    }

    return normErr;
};

/**
 * Class represented netron interface.
 * 
 * For checking object is netron interface use is.netron2Interface() predicate.
 */
class Interface {
    constructor(def, peerId) {
        this[__.I_DEFINITION_SYMBOL] = def;
        this[__.I_PEERID_SYMBOL] = peerId;
    }
}
tag.add(Interface, "NETRON2_INTERFACE");

class NetworkInfo {
    constructor(netCore) {
        this.netCore = netCore;
    }
}

export default class Netron extends adone.task.Manager {
    constructor(peerInfo, options) {
        super();

        this.peer = new OwnPeer(PeerInfo.create(peerInfo), this);

        this.options = {
            responseTimeout: 60000 * 3,
            proxyContexts: false,
            // acceptTwins: true,
            // transpiler: {
            //     plugins: [
            //         "transform.asyncToGenerator"
            //     ],
            //     compact: false
            // },
            ...options
        };

        this.contexts = new Map();
        this.peers = new Map();
        this.networks = new Map();
        this._peerEvents = new Map();
        // this._remoteListeners = new Map();
        // this._contextEvents = new Map();

        this._stubs = new Map();
        this._peerStubs = new Map();
        this._defUniqueId = this.options.uniqueId || new FastUniqueId();
        // this._localTwins = new Map();

        this.setMaxListeners(Infinity);
    }

    // NetCores management

    /**
     * Creates new netcore instance and own it.
     * 
     * @param {string} netId network name
     * @returns {net.p2p.Core} - return instance of p2p core
     */
    createNetCore(netId, config = {}) {
        if (this.networks.has(netId)) {
            throw new exception.Exists(`Core '${netId}' is already exist`);
        }

        if (!config.transport) {
            // Set TCP as default transport
            config.transport = "tcp";
        }

        const netCore = new adone.net.p2p.Core({
            ...config,
            peer: this.peer.info
        });

        this.networks.set(netId, new NetworkInfo(netCore));
        return netCore;
    }

    /**
     * Deletes early created network core.
     * 
     * If netcore is used, it will be stopped.
     * 
     * @param {string} netId network name
     */
    deleteNetCore(netId) {
        const netCore = this.getNetCore(netId);
        if (netCore.started) {
            throw new exception.NotAllowed("It is not allow to delete active netcore");
        }
        this.networks.delete(netId);
    }

    /**
     * Returns netcore instance by id.
     * @param {string} netId network name
     */
    getNetCore(netId) {
        const ni = this.networks.get(netId);
        if (is.undefined(ni)) {
            throw new exception.Unknown(`Unknown network name: ${netId}`);
        }

        return ni.netCore;
    }

    /**
     * Connects to peer using netcore identified by 'netId'.
     * 
     * @param {string} netId - network core name
     * @param {options.onlyRaw} - if set to true, only raw connection will be initiated
     * @param {options.tasks} - tasks that should be executed on remote side after successful connection to netron protocol
     * @param {PeerInfo|string|Peer} peer - instance of RemotePeer
     */
    async connect(netId, peer, { onlyRaw = false, tasks = CONNECT_TASKS } = {}) {
        try {
            return this.getPeer(peer);
        } catch (err) {
            // fresh peer...
        }
        const netCore = this.getNetCore(netId);
        const rawConn = await netCore.connect(peer);
        const remotePeer = new adone.netron2.RemotePeer(PeerInfo.create(peer), this, netCore);
        await remotePeer._setConnInfo(rawConn);

        if (!onlyRaw) {
            try {
                // Try to connect using netron protocol
                const netronConn = await netCore.connect(peer, adone.netron2.NETRON_PROTOCOL);
                await remotePeer._setConnInfo(undefined, netronConn);

                if (!is.nil(tasks)) {
                    await remotePeer.runTask(tasks);
                }
            } catch (err) {
                // Nothing to do...
            }
        }

        this._peerConnected(remotePeer);
        return remotePeer;
    }

    /**
     * Disconnects all peers associated with network identified by 'netId' or all networks if not specified.
     * 
     * @param {string} netId - network name
     */
    async disconnect(netId) {
        if (is.nil(netId)) {
            //
        }
        // for (const peer of this.peers.values()) {
        //     await peer.disconnect();
        // }
    }

    async disconnectPeer(peerId) {
        const peer = this.getPeer(peerId);
        await peer.netCore.disconnect(peer.info);
        return this._peerDisconnected(peer);
    }

    /**
     * Starts netcore with specified id or all created netcores if 'netId' is undefined.
     * 
     * @param {string} netId network name
     */
    async start(netId, { netronProtocol = true } = {}) {
        if (!is.string(netId)) {
            const promises = [];
            for (const id of this.networks.keys()) {
                promises.push(this.start(id));
            }
            return Promise.all(promises);
        }

        const netCore = this.getNetCore(netId);
        if (!netCore.started) {
            await netCore.start();

            // TODO: obtain raw connection for remote peer
            netCore.on("peer:connect", (peerInfo) => {
                const remotePeer = new adone.netron2.RemotePeer(peerInfo, this, netCore);
                this._peerConnected(remotePeer);
            });

            netCore.on("peer:disconnect", (peerInfo) => {
                this._peerDisconnected(this.peers.get(peerInfo.id.asBase58()));
            });

            if (netronProtocol) {
                netCore.handle(adone.netron2.NETRON_PROTOCOL, async (protocol, conn) => {
                    const peerInfo = await conn.getPeerInfo();
                    const remotePeer = this.peers.get(peerInfo.id.asBase58());
                    remotePeer.protocol = protocol;
                    remotePeer._setConnInfo(undefined, conn);
                });
            }
        }
    }

    _peerConnected(peer) {
        this.peers.set(peer.info.id.asBase58(), peer);
        peer.connectedTime = new Date();
        return this._emitPeerEvent("peer:connect", peer);
    }

    async _peerDisconnected(peer) {
        this.peers.delete(peer.info.id.asBase58());


        // const listeners = this._remoteListeners.get(peer.uid);
        // if (!is.undefined(listeners)) {
        //     for (const [eventName, fn] of listeners.entries()) {
        //         this.removeListener(eventName, fn);
        //     }
        // }
        // this._remoteListeners.delete(peer.uid);
        this._peerStubs.delete(peer.uid);

        // Release stubs sended to peer;
        for (const [defId, stub] of this._stubs.entries()) {
            const def = stub.definition;
            if (def.uid === peer.uid) {
                this._stubs.delete(defId);
                this._releaseOriginatedContexts(defId);
            }
        }

        peer.interfaces.clear();

        await this._emitPeerEvent("peer:disconnect", peer);
        this._peerEvents.delete(peer.info.id.asBase58());
    }

    /**
     * Stops netcore.
     * @param {string} netCoreId netcore identification name
     */
    async stop(netId) {
        if (!is.string(netId)) {
            const promises = [];
            for (const id of this.networks.keys()) {
                promises.push(this.stop(id));
            }
            return Promise.all(promises);
        }

        const netCore = this.getNetCore(netId);
        if (netCore.started) {

            await netCore.stop();
        }
    }

    refContext(peerInfo, obj) {
        const peerId = peerInfo.id.asBase58();
        let stubs = this._peerStubs.get(peerId);
        if (is.undefined(stubs)) {
            stubs = [];
            this._peerStubs.set(peerId, stubs);
        }
        const stub = stubs.find((s) => s.instance === obj);
        if (is.undefined(stub)) {
            const stub = new Stub(this, obj);
            const def = stub.definition;
            this._stubs.set(def.id, stub);
            stubs.push(stub);
            return def;
        }
        return stub.definition;
    }

    // releaseContext(obj, releaseOriginated = true) {
    //     for (const [defId, stub] of this._stubs.entries()) {
    //         if (stub.instance === obj) {
    //             this._stubs.delete(defId);
    //             releaseOriginated && this._releaseOriginatedContexts(defId, true);
    //         }
    //     }

    //     for (const [uid, stubs] of this._peerStubs.entries()) {
    //         for (let i = 0; i < stubs.length; i++) {
    //             const stub = stubs[i];
    //             if (stub.instance === obj) {
    //                 stubs.splice(i, 1);
    //                 if (stubs.length === 0) {
    //                     this._peerStubs.delete(uid);
    //                 }
    //                 break;
    //             }
    //         }
    //     }
    // }

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
            throw new exception.Exists(`Context '${ctxId}' already attached`);
        }

        return this._attachContext(ctxId, new Stub(this, r));
    }

    /**
     * Detaches before attached context with specified name.
     */
    detachContext(ctxId, releaseOriginated = true) {
        const stub = this.contexts.get(ctxId);
        if (is.undefined(stub)) {
            throw new exception.Unknown(`Unknown context '${ctxId}'`);
        }

        this.contexts.delete(ctxId);
        const defId = stub.definition.id;
        releaseOriginated && this._releaseOriginatedContexts(defId);
        this._stubs.delete(defId);
        // this._emitContextEvent("context detach", { id: ctxId, defId });
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
        const names = [];
        for (const k of this.contexts.keys()) {
            names.push(k);
        }
        return names;
    }

    _getStub(defId) {
        const stub = this._stubs.get(defId);
        if (is.undefined(stub)) {
            throw new exception.Unknown(`Unknown definition '${defId}'`);
        }
        return stub;
    }

    // setInterfaceTwin(ctxClassName, TwinClass) {
    //     if (!is.class(TwinClass)) {
    //         throw new exception.InvalidArgument("TwinClass should be a class");
    //     }
    //     if (!is.netronInterface(new TwinClass())) {
    //         throw new exception.InvalidArgument("TwinClass should be extended from adone.netron.Interface");
    //     }
    //     const Class = this._localTwins.get(ctxClassName);
    //     if (!is.undefined(Class)) {
    //         throw new exception.Exists(`Twin for interface '${ctxClassName}' exists`);
    //     }
    //     this._localTwins.set(ctxClassName, TwinClass);
    // }

    /**
     * Returns meta data.
     * 
     * @param {*} peer - instance of AbstractPeer implementation
     * @param {Array|Object|string} request
     */
    async requestMeta(peer, request) {
        const response = [];
        const requests = adone.util.arrify(request);

        for (let request of requests) {
            if (is.string(request)) {
                request = {
                    id: request
                };
            }
            try {
                const handler = this.getMetaHandler(request.id);
                const data = await handler(this, peer, request); // eslint-disable-line
                response.push({
                    id: request.id,
                    data
                });
            } catch (error) {
                response.push({
                    id: request.id,
                    error
                });
            }
        }

        return response;
    }

    getPeer(peerId) {
        if (is.nil(peerId)) {
            return this.peer;
        }

        let base58Id;
        if (is.netron2Peer(peerId)) {
            base58Id = peerId.info.id.asBase58();
            if (this.peers.has(base58Id)) {
                return peerId;
            }
        } else if (is.p2pPeerInfo(peerId)) {
            base58Id = peerId.id.asBase58();
        } else if (is.p2pPeerId(peerId)) {
            base58Id = peerId.asBase58();
        } else if (is.string(peerId)) { // base58
            base58Id = peerId;
        } else {
            throw new exception.NotValid(`Invalid type of peer identity: ${adone.meta.typeOf(peerId)}`);
        }

        const peer = this.peers.get(base58Id);
        if (is.undefined(peer)) {
            if (this.peer.info.id.asBase58() === base58Id) {
                return this.peer;
            }
            throw new exception.Unknown(`Unknown peer: '${peerId.toString()}'`);
        }
        return peer;
    }

    getPeerForInterface(iInstance) {
        if (!is.netron2Interface(iInstance)) {
            throw new exception.NotValid("Object is not a netron interface");
        }

        return this.getPeer(iInstance[__.I_PEERID_SYMBOL]);
    }

    // _onReceiveInitial(peer, data) {
    //     peer.isSuper = Boolean(data.isSuper);
    //     if (peer.isSuper) {
    //         peer._attachedContexts = new Map();
    //     }
    //     peer.uid = data.uid;
    //     if (is.propertyDefined(data, "defs")) {
    //         peer._updateStrongDefinitions(data.defs);
    //     }
    // }

    _releaseOriginatedContexts(defId) {
        const defIds = [];
        const ignoreIds = [];
        this._deepScanChilds(defId, defIds, ignoreIds);
        for (const defId of defIds) {
            this._stubs.delete(defId);
        }
    }

    _deepScanChilds(parentId, defIds, ignoreIds) {
        for (const [defId, stub] of this._stubs.entries()) {
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

    // // _removePeersRelatedDefinitions(exceptPeer, proxyDef) {
    // //     for (let peer of this.peers.values()) {
    // //         if (peer.uid !== exceptPeer.uid) {
    // //             peer._removeRelatedDefinitions(proxyDef);
    // //         }
    // //     }
    // // }

    async _processPacket(peer, packet) {
        const action = packet.getAction();
        switch (action) {
            case ACTION.SET: {
                if (packet.getImpulse()) {
                    const data = packet.data;
                    const defId = data[0];
                    const name = data[1];
                    const stub = this._stubs.get(defId);
                    if (!is.undefined(stub)) {
                        try {
                            await stub.set(name, data[2], peer);
                        } catch (err) {
                            adone.error(err.message);
                        }
                    }
                } else { // reply
                    const awaiter = peer._removeAwaiter(packet.streamId);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            case ACTION.GET: {
                const data = packet.data;
                const defId = data[0];
                const name = data[1];
                const stub = this._stubs.get(defId);

                try {
                    if (is.undefined(stub)) {
                        return this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, new exception.NotExists("Context not exists")]);
                    }
                    const result = await stub.get(name, data[2], peer);
                    await this.send(peer, 0, packet.streamId, 1, ACTION.SET, [0, result]);
                } catch (err) {
                    adone.error(err);
                    if (err.name !== "NetronIllegalState") {
                        try {
                            await this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, normalizeError(err)]);
                        } catch (err) {
                            adone.error(err);
                        }
                    }
                }
                break;
            }
            case ACTION.TASK: {
                if (packet.getImpulse()) {
                    packet.setData(await this._runPeerTask(peer, packet.data));
                    peer.sendReply(packet);
                } else {
                    const awaiter = peer._deleteAwaiter(packet.id);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
        }
    }

    async _runPeerTask(peer, task) {
        const tasksResults = {};
        const results = [];

        for (let t of adone.util.arrify(task)) {
            if (is.string(t)) {
                t = {
                    task: t
                };
            }
            if (is.plainObject(t) && is.string(t.task)) {
                if (!this.hasTask(t.task)) {
                    if (t.task in adone.netron2.task) {
                        // eslint-disable-next-line
                        await this.addTask(t.task, adone.netron2.task[t.task], {
                            singleton: true
                        });
                    } else {
                        tasksResults[t.task] = {
                            error: new exception.NotExists(`Task '${t.task}' is not exist`)
                        };
                        continue;
                    }
                }
                const observer = await this.run(t.task, peer, ...adone.util.arrify(t.args)); // eslint-disable-line
                const r = is.promise(observer.result) ? observer.result : Promise.resolve(observer.result);
                results.push(r.then((result) => {
                    tasksResults[t.task] = {
                        result
                    };
                }).catch((error) => {
                    tasksResults[t.task] = {
                        error
                    };
                }));
            }
        }

        await Promise.all(results);
        return tasksResults;
    }

    _createInterface(def, peer) {
        const defId = def.id;
        const base58Str = peer.info.id.asBase58();
        let iInstance = peer.interfaces.get(defId);
        if (!is.undefined(iInstance)) {
            return iInstance;
        }

        // Заготовка под создаваемый интерфейс.
        class XInterface extends Interface { }

        const proto = XInterface.prototype;

        for (const [key, meta] of util.entries(def.$, { all: true })) {
            if (meta.method) {
                const method = (...args) => {
                    this._processArgs(peer.info, args, true);
                    return peer.get(defId, key, args);
                };
                method.void = (...args) => {
                    this._processArgs(peer.info, args, true);
                    return peer.set(defId, key, args);
                };
                proto[key] = method;
            } else {
                const propMethods = {};
                propMethods.get = (defaultValue) => {
                    defaultValue = this._processArgs(peer.info, defaultValue, false);
                    return peer.get(defId, key, defaultValue);
                };
                if (!meta.readonly) {
                    propMethods.set = (value) => {
                        value = this._processArgs(peer.info, value, false);
                        return peer.set(defId, key, value);
                    };
                }
                proto[key] = propMethods;
            }
        }

        iInstance = new XInterface(def, base58Str);

        // if (!is.undefined(def.twin)) {
        //     let twinCode;
        //     if (!is.string(def.twin) && is.string(def.twin.node)) {
        //         twinCode = def.twin.node;
        //     } else {
        //         twinCode = def.twin;
        //     }

        //     if (is.string(twinCode)) {
        //         const wrappedCode = `
        //             (function() {
        //                 return ${twinCode};
        //             })();`;

        //         const taskClassScript = adone.std.vm.createScript(adone.js.compiler.core.transform(wrappedCode, this.options.transpiler).code, { filename: def.name, displayErrors: true });
        //         const scriptOptions = {
        //             displayErrors: true,
        //             breakOnSigint: false
        //         };

        //         const TwinInterface = taskClassScript.runInThisContext(scriptOptions);
        //         if (is.netronInterface(new TwinInterface())) {
        //             class XTwin extends TwinInterface { }
        //             const twinProto = XTwin.prototype;
        //             const twinMethods = util.keys(twinProto, { all: true });
        //             for (const [name, prop] of util.entries(XInterface.prototype, { all: true })) {
        //                 if (!twinMethods.includes(name)) {
        //                     twinProto[name] = prop;
        //                 }
        //             }

        //             const twinInterface = new XTwin();
        //             twinInterface.$twin = anInterface;
        //             this.interfaces.set(hash, twinInterface);
        //             return twinInterface;
        //         }
        //     }
        // } else if (this._localTwins.has(def.name)) {
        //     const TwinInterface = this._localTwins.get(def.name);
        //     if (!is.undefined(TwinInterface)) {
        //         class XTwin extends TwinInterface { }
        //         const twinProto = XTwin.prototype;
        //         const twinMethods = util.keys(twinProto, { all: true });
        //         for (const [name, prop] of util.entries(XInterface.prototype, { all: true })) {
        //             if (!twinMethods.includes(name)) {
        //                 twinProto[name] = prop;
        //             }
        //         }

        //         const twinInterface = new XTwin();
        //         twinInterface.$twin = anInterface;
        //         this.interfaces.set(hash, twinInterface);
        //         return twinInterface;
        //     }
        // }

        peer.interfaces.set(defId, iInstance);
        return iInstance;
    }

    _processArgs(peerInfo, args, isMethod) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                args[i] = this._processObject(peerInfo, args[i]);
            }
        } else {
            return this._processObject(peerInfo, args);
        }
    }

    _processObject(peerInfo, obj) {
        if (is.netronInterface(obj)) {
            return new Reference(obj[__.I_DEFINITION_SYMBOL].id);
        } else if (is.netronContext(obj)) {
            const def = this.refContext(peerInfo, obj);
            def.uid = peerInfo.id.asBase58(); // definition owner
            return def;
        } else if (is.netronDefinitions(obj)) {
            const newDefs = new Definitions();
            for (let i = 0; i < obj.length; i++) {
                newDefs.push(this._processObject(peerInfo, obj.get(i)));
            }
            return newDefs;
        }
        return obj;
    }

    _attachContext(ctxId, stub) {
        const def = stub.definition;
        const defId = def.id;
        this.contexts.set(ctxId, stub);
        this._stubs.set(defId, stub);
        // this._emitContextEvent("context attach", {
        //     id: ctxId,
        //     defId,
        //     def
        // });
        return defId;
    }

    // async _emitContextEvent(event, ctxData) {
    //     let events = this._contextEvents.get(ctxData.id);
    //     if (is.undefined(events)) {
    //         events = [event];
    //         this._contextEvents.set(ctxData.id, events);
    //     } else {
    //         events.push(event);
    //         if (events.length > 1) {
    //             return;
    //         }
    //     }
    //     while (events.length > 0) {
    //         event = events[0];
    //         try {
    //             // eslint-disable-next-line
    //             await this.emitParallel(event, ctxData);
    //         } catch (err) {
    //             adone.error(err);
    //         }
    //         events.splice(0, 1);
    //     }
    // }

    // _proxifyContext(ctxId, stub) {
    //     const def = stub.definition;
    //     const defId = def.id;
    //     this._stubs.set(defId, stub);
    //     return defId;
    // }

    async _emitPeerEvent(event, peer) {
        let events = this._peerEvents.get(peer.info.id.asBase58());
        if (is.undefined(events)) {
            events = [event];
            this._peerEvents.set(peer, events);
        } else {
            events.push(event);
            if (events.length > 1) {
                return;
            }
        }
        while (events.length > 0) {
            event = events[0];
            try {
                // eslint-disable-next-line
                await this.emitParallel(event, peer);
            } catch (err) {
                adone.error(err);
            }
            events.splice(0, 1);
        }
    }
}
tag.add(Netron, "NETRON2");
