const {
    is,
    x,
    util,
    event,
    net: { p2p: { PeerInfo } },
    netron2: { Packet, Reference, Definitions, Reflection, Stub, FastUniqueId, OwnPeer, ACTION },
    tag
} = adone;

const USEFUL_META_REQUEST = ["ability", "contexts"];

const __ = adone.private(adone.netron2);

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

export default class Netron extends event.AsyncEmitter {
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
        // this._peerEvents = new Map();
        // this._remoteEvents = new Map();
        // this._remoteListeners = new Map();
        // this._contextEvents = new Map();

        this._stubs = new Map();
        this._peerStubs = new Map();
        this._defUniqueId = this.options.uniqueId || new FastUniqueId();
        // this._localTwins = new Map();

        this._metaHandlers = new Map();
        // Default metahandlers
        for (const [id, handler] of Object.entries(adone.netron2.metaHandler)) {
            this.setMetaHandler(id, handler);
        }

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
            throw new adone.x.Exists(`Core '${netId}' is already exist`);
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
     * Deletes early created netcore.
     * 
     * If netcore is used, it will be stopped.
     * 
     * @param {string} netId network name
     */
    deleteNetCore(netId) {
        const netCore = this.getNetCore(netId);
        if (netCore.started) {
            throw new adone.x.NotAllowed("It is not allow to delete active netcore");
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
            throw new adone.x.Unknown(`Unknown network name: ${netId}`);
        }

        return ni.netCore;
    }

    /**
     * Connects to peer using netcore identified by 'netCoreId'.
     * @param {string} netId - network/netcore name
     * @param {options.onlyRaw} - if set to true, only raw connection will be initiated
     * @param {options.metaRequest} - meta requests that will be executed after successful connection to netron protocol
     * @param {PeerInfo|string|Peer} peer - instance of RemotePeer
     */
    async connect(netId, peer, { onlyRaw = false, metaRequest = USEFUL_META_REQUEST } = {}) {
        const netCore = this.getNetCore(netId);
        const rawConn = await netCore.connect(peer);
        const remotePeer = new adone.netron2.RemotePeer(PeerInfo.create(peer), this, netCore);
        await remotePeer._setConnInfo(rawConn);

        if (!onlyRaw) {
            try {
                // Try to connect using netron protocol
                const netronConn = await netCore.connect(peer, adone.netron2.NETRON_PROTOCOL);
                await remotePeer._setConnInfo(undefined, netronConn);

                if (!is.nil(metaRequest)) {
                    await remotePeer.requestMeta(metaRequest);
                }
            } catch (err) {
                // Nothing to do...
            }
        }

        this._peerConnected(remotePeer);
        return remotePeer;
    }

    /**
     * Disconnects from remote peers in from network identified by 'netId'.
     * 
     * @param {string} netId - network name
     */
    async disconnect(netId) {
        // for (const peer of this.peers.values()) {
        //     await peer.disconnect();
        // }
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
        this.emit("peer:connect", peer);
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

        // await this._emitPeerEvent("peer offline", peer);
        // this._peerEvents.delete(peer);
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

    // disconnect(uid) {
    //     if (is.nil(uid)) {
    //         const promises = [];
    //         for (const uid of this.peers.keys()) {
    //             promises.push(this.disconnect(uid));
    //         }
    //         return Promise.all(promises);
    //     }
    //     return this.getPeer(uid).disconnect();
    // }

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

    attachContext(instance, ctxId = null) {
        // Call this first because it validate instance.
        const r = Reflection.from(instance);

        if (is.null(ctxId)) {
            ctxId = instance.__proto__.constructor.name;
        }
        if (this.contexts.has(ctxId)) {
            throw new x.Exists(`Context '${ctxId}' already attached`);
        }

        return this._attachContext(ctxId, new Stub(this, r));
    }

    detachContext(ctxId, releaseOriginted = true) {
        const stub = this.contexts.get(ctxId);
        if (is.undefined(stub)) {
            throw new x.Unknown(`Unknown context '${ctxId}'`);
        }

        this.contexts.delete(ctxId);
        const defId = stub.definition.id;
        releaseOriginted && this._releaseOriginatedContexts(defId);
        this._stubs.delete(defId);
        // this._emitContextEvent("context detach", { id: ctxId, defId });
        return defId;
    }

    // async attachContextRemote(uid, instance, ctxId = null) {
    //     const peer = this.getPeer(uid);
    //     if (!peer.isSuper) {
    //         throw new x.Unknown(`Peer '${uid}' is not a super-netron`);
    //     }
    //     const r = Reflection.from(instance);
    //     if (is.null(ctxId)) {
    //         ctxId = instance.__proto__.constructor.name;
    //     }
    //     const defId = peer._attachedContexts.get(ctxId);
    //     if (!is.undefined(defId)) {
    //         throw new x.Exists(`Context '${ctxId}' already attached on the peer '${uid}' side`);
    //     }

    //     const stub = new Stub(this, instance, r);
    //     const def = stub.definition;
    //     this._stubs.set(def.id, stub);
    //     peer._attachedContexts.set(ctxId, def.id);
    //     return new Promise((resolve, reject) => {
    //         this.send(peer, 1, peer.streamId.next(), 1, ACTION.CONTEXT_ATTACH, { id: ctxId, def }, resolve).catch(reject);
    //     });
    // }

    // async detachContextRemote(uid, ctxId) {
    //     const peer = this.getPeer(uid);
    //     if (!peer.isSuper) {
    //         throw new x.Unknown(`Peer '${uid}' is not a super-netron`);
    //     }
    //     const defId = peer._attachedContexts.get(ctxId);
    //     if (is.undefined(defId)) {
    //         throw new x.NotExists(`Context '${ctxId}' not attached on the peer '${uid}' code`);
    //     }
    //     this._stubs.delete(defId);
    //     peer._attachedContexts.delete(ctxId);
    //     return new Promise((resolve, reject) => {
    //         this.send(peer, 1, peer.streamId.next(), 1, ACTION.CONTEXT_DETACH, ctxId, resolve).catch(reject);
    //     });
    // }


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

    getStubById(defId) {
        const stub = this._stubs.get(defId);
        if (is.undefined(stub)) {
            throw new x.Unknown(`Unknown definition '${defId}'`);
        }
        return stub;
    }

    // setInterfaceTwin(ctxClassName, TwinClass) {
    //     if (!is.class(TwinClass)) {
    //         throw new x.InvalidArgument("TwinClass should be a class");
    //     }
    //     if (!is.netronInterface(new TwinClass())) {
    //         throw new x.InvalidArgument("TwinClass should be extended from adone.netron.Interface");
    //     }
    //     const Class = this._localTwins.get(ctxClassName);
    //     if (!is.undefined(Class)) {
    //         throw new x.Exists(`Twin for interface '${ctxClassName}' exists`);
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

        let base58;
        if (is.netron2Peer(peerId)) {
            base58 = peerId.info.id.asBase58();
            if (this.peers.has(base58)) {
                return peerId;
            }
        } else if (is.peerInfo(peerId)) {
            base58 = peerId.id.asBase58();
        } else if (is.peerId(peerId)) {
            base58 = peerId.asBase58();
        } else if (is.string(peerId)) { // base58
            base58 = peerId;
        } else {
            throw new x.NotValid(`Invalid type of peer identity: ${adone.util.typeOf(peerId)}`);
        }

        const peer = this.peers.get(base58);
        if (is.undefined(peer)) {
            if (this.peer.info.id.asBase58() === base58) {
                return this.peer;
            }
            throw new x.Unknown(`Unknown peer: '${peerId.toString()}'`);
        }
        return peer;
    }

    getPeerForInterface(iInstance) {
        if (!is.netron2Interface(iInstance)) {
            throw new x.NotValid("Object is not a netron interface");
        }

        return this.getPeer(iInstance[__.I_PEERID_SYMBOL]);
    }

    // async onRemote(uid, eventName, handler) {
    //     if (is.nil(uid)) {
    //         const promises = [];
    //         for (const uid of this.peers.keys()) {
    //             promises.push(this.onRemote(uid, eventName, handler));
    //         }
    //         return Promise.all(promises);
    //     }
    //     const peer = this.getPeer(uid);
    //     let events = this._remoteEvents.get(uid);
    //     if (is.undefined(events)) {
    //         events = new Map();
    //         events.set(eventName, [handler]);
    //         this._remoteEvents.set(uid, events);
    //         await (new Promise((resolve, reject) => {
    //             this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_ON, eventName, resolve).catch(reject);
    //         }));
    //     } else {
    //         const handlers = events.get(eventName);
    //         if (is.undefined(handlers)) {
    //             events.set(eventName, [handler]);
    //             await (new Promise((resolve, reject) => {
    //                 this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_ON, eventName, resolve).catch(reject);
    //             }));
    //         } else {
    //             handlers.push(handler);
    //         }
    //     }

    // }

    // async offRemote(uid, eventName, listener) {
    //     if (is.nil(uid)) {
    //         const promises = [];
    //         for (const uid of this.peers.keys()) {
    //             promises.push(this.offRemote(uid, eventName, listener));
    //         }
    //         return Promise.all(promises);
    //     }
    //     const peer = this.getPeer(uid);
    //     const events = this._remoteEvents.get(uid);
    //     if (!is.undefined(events)) {
    //         const listeners = events.get(eventName);
    //         if (!is.undefined(listeners)) {
    //             const index = listeners.indexOf(listener);
    //             if (index >= 0) {
    //                 listeners.splice(index, 1);
    //                 if (listeners.length === 0) {
    //                     events.delete(eventName);
    //                     await (new Promise((resolve, reject) => {
    //                         this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_OFF, eventName, resolve).catch(reject);
    //                     }));
    //                 }
    //             }
    //         }
    //     }
    // }

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

    // customProcessPacket(peer, packet) {
    // }

    setMetaHandler(id, handler, replace = false) {
        const localHandler = this._metaHandlers.get(id);
        if (!is.undefined(localHandler) && !replace) {
            throw new x.Exists(`Handler '${id}' already exists`);
        }
        this._metaHandlers.set(id, handler);
    }

    getMetaHandler(id) {
        const handler = this._metaHandlers.get(id);
        if (is.undefined(handler)) {
            throw new adone.x.NotExists(`Handler '${is}' not exists`);
        }
        return handler;
    }

    deleteMetaHandler(id, handler) {
        this._metaHandlers.delete(handler);
    }

    async _processPacket(peer, rawPacket) {
        let packet;
        try {
            packet = Packet.from(rawPacket);
        } catch (err) {
            return adone.error(err.message);
        }

        const action = packet.getAction();
        switch (action) {
            case ACTION.META: {
                if (packet.getImpulse()) {
                    packet.setData(await this.requestMeta(peer, packet.data));
                    peer.sendReply(packet);
                } else {
                    const awaiter = peer._deleteAwaiter(packet.id);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            // case ACTION.SET: {
            //     switch (status) {
            //         case PEER_STATUS.HANDSHAKING: {
            //             if (!packet.getImpulse()) {
            //                 const awaiter = peer._removeAwaiter(packet.streamId);
            //                 !is.undefined(awaiter) && awaiter(packet);
            //             } else {
            //                 adone.error("Illegal `impulse` flag (1) during handshake response");
            //             }
            //             return;
            //         }
            //         case PEER_STATUS.ONLINE: {
            //             if (packet.getImpulse()) {
            //                 const data = packet.data;
            //                 const defId = data[0];
            //                 const name = data[1];
            //                 const stub = this._stubs.get(defId);
            //                 if (!is.undefined(stub)) {
            //                     try {
            //                         await stub.set(name, data[2], peer);
            //                     } catch (err) {
            //                         adone.error(err.message);
            //                     }
            //                 }
            //             } else { // reply
            //                 const awaiter = peer._removeAwaiter(packet.streamId);
            //                 !is.undefined(awaiter) && awaiter(packet.data);
            //             }
            //             return;
            //         }
            //         default: {
            //             adone.error(`Unknown peer status: ${status}`);
            //         }
            //     }
            //     break;
            // }
            // case ACTION.GET: {
            //     switch (status) {
            //         case PEER_STATUS.HANDSHAKING: {
            //             if (!packet.getImpulse()) {
            //                 peer.disconnect();
            //                 adone.error("Flag `impulse` cannot be zero during request of handshake");
            //             } else {
            //                 await this.customProcessPacket(peer, packet);
            //             }
            //             return;
            //         }
            //         case PEER_STATUS.ONLINE: {
            //             const data = packet.data;
            //             const defId = data[0];
            //             const name = data[1];
            //             const stub = this._stubs.get(defId);

            //             try {
            //                 if (is.undefined(stub)) {
            //                     return this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, new x.NotExists("Context not exists")]);
            //                 }
            //                 const result = await stub.get(name, data[2], peer);
            //                 await this.send(peer, 0, packet.streamId, 1, ACTION.SET, [0, result]);
            //             } catch (err) {
            //                 adone.error(err);
            //                 if (err.name !== "NetronIllegalState") {
            //                     try {
            //                         let normErr;
            //                         if (is.knownError(err)) {
            //                             normErr = err;
            //                         } else {
            //                             normErr = new Error(err.message);
            //                             normErr.stack = err.stack;
            //                         }
            //                         await this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, normErr]);
            //                     } catch (err) {
            //                         adone.error(err);
            //                     }
            //                 }
            //             }
            //             return;
            //         }
            //     }
            //     break;
            // }
        }

        // status = ONLINE

        // switch (action) {
        //     case ACTION.CONTEXT_ATTACH: {
        //         if (packet.getImpulse()) {
        //             if ((await this.customProcessPacket(peer, packet)) === false) {
        //                 return this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, new x.NotImplemented("This feature is not implemented")]);
        //             }
        //         } else { // reply
        //             const awaiter = peer._removeAwaiter(packet.streamId);
        //             !is.undefined(awaiter) && awaiter(packet.data);
        //         }
        //         break;
        //     }
        //     case ACTION.CONTEXT_DETACH: {
        //         if (packet.getImpulse()) {
        //             if ((await this.customProcessPacket(peer, packet)) === false) {
        //                 return this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, new x.NotImplemented("This feature is not implemented")]);
        //             }
        //         } else { // reply
        //             const awaiter = peer._removeAwaiter(packet.streamId);
        //             !is.undefined(awaiter) && awaiter(packet.data);
        //         }
        //         break;
        //     }
        //     case ACTION.EVENT_ON: {
        //         if (packet.getImpulse()) {
        //             const eventName = packet.data;
        //             const fn = (...args) => {
        //                 if (this.options.isSuper) {
        //                     if (!is.undefined(peer._ownDefIds)) {
        //                         if (peer._ownDefIds.includes(args[0].defId)) {
        //                             return;
        //                         }
        //                     }
        //                 }
        //                 return new Promise((resolve, reject) => {
        //                     this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_EMIT, [eventName].concat(args), resolve).catch(reject);
        //                 });
        //             };
        //             //this._emitRemote.bind(this, peer, eventName);
        //             const listeners = this._remoteListeners.get(peer.uid);
        //             if (is.undefined(listeners)) {
        //                 const map = new Map();
        //                 map.set(eventName, fn);
        //                 this._remoteListeners.set(peer.uid, map);
        //             } else if (!listeners.has(eventName)) {
        //                 listeners.set(eventName, fn);
        //             }
        //             this.on(eventName, fn);
        //             try {
        //                 await this.send(peer, 0, packet.streamId, 1, ACTION.EVENT_ON, eventName);
        //             } catch (err) {
        //                 adone.error(err);
        //             }
        //         } else { // reply
        //             const awaiter = peer._removeAwaiter(packet.streamId);
        //             !is.undefined(awaiter) && awaiter(packet.data);
        //         }
        //         break;
        //     }
        //     case ACTION.EVENT_OFF: {
        //         if (packet.getImpulse()) {
        //             const data = packet.data;
        //             const eventName = data[0];
        //             const listeners = this._remoteListeners.get(peer.uid);
        //             if (!is.undefined(listeners)) {
        //                 const fn = listeners.get(eventName);
        //                 if (!is.undefined(fn)) {
        //                     this.removeListener(eventName, fn);
        //                     listeners.delete(eventName);
        //                     if (listeners.size === 0) {
        //                         this._remoteListeners.delete(peer.uid);
        //                     }
        //                 }
        //             }
        //             try {
        //                 await this.send(peer, 0, packet.streamId, 1, ACTION.EVENT_OFF, eventName);
        //             } catch (err) {
        //                 adone.error(err);
        //             }
        //         } else { // reply
        //             const awaiter = peer._removeAwaiter(packet.streamId);
        //             !is.undefined(awaiter) && awaiter(packet.data);
        //         }
        //         break;
        //     }
        //     case ACTION.EVENT_EMIT: {
        //         if (packet.getImpulse()) {
        //             const args = packet.data;
        //             const eventName = args.shift();
        //             args.unshift(peer);
        //             const events = this._remoteEvents.get(peer.uid);
        //             if (!is.undefined(events)) {
        //                 const handlers = events.get(eventName);
        //                 if (!is.undefined(handlers)) {
        //                     const promises = [];
        //                     for (const fn of handlers) {
        //                         promises.push(Promise.resolve(fn.apply(this, args)));
        //                     }
        //                     try {
        //                         await Promise.all(promises).then(() => {
        //                             return this.send(peer, 0, packet.streamId, 1, ACTION.EVENT_EMIT);
        //                         });
        //                     } catch (err) {
        //                         adone.error(err);
        //                     }
        //                 }
        //             }
        //         } else { // reply
        //             const awaiter = peer._removeAwaiter(packet.streamId);
        //             !is.undefined(awaiter) && awaiter(packet.data);
        //         }
        //         break;
        //     }
        //     default:
        //         await this.customProcessPacket(peer, packet);
        //         break;
        // }
    }

    // _createPeer(socket, gate, peerType) {
    //     throw new x.NotImplemented("Method _createPeer() should be implemented");
    // }

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

    // async _emitPeerEvent(event, peer) {
    //     let events = this._peerEvents.get(peer);
    //     if (is.undefined(events)) {
    //         events = [event];
    //         this._peerEvents.set(peer, events);
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
    //             await this.emitParallel(event, peer);
    //         } catch (err) {
    //             adone.error(err);
    //         }
    //         events.splice(0, 1);
    //     }
    // }
}
tag.add(Netron, "NETRON2");
