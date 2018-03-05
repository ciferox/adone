const {
    is,
    error,
    net: { p2p: { PeerInfo } },
    netron2: { Reflection, Stub, FastUniqueId, OwnPeer, ACTION },
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

        this.interfaceFactory = new __.InterfaceFactory(this);
        this.contexts = new Map();
        this.peers = new Map();
        this.networks = new Map();
        this._ownEvents = new Map();

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
            throw new error.Exists(`Core '${netId}' is already exist`);
        }

        if (!config.transport) {
            // Set TCP as default transport
            config.transport = "tcp";
        }

        config.muxer = "spdy";

        const netCore = new adone.net.p2p.Core({
            ...config,
            peer: this.peer.info
        });

        netCore.on("peer:disconnect", (peerInfo) => {
            try {
                this._peerDisconnected(this.getPeer(peerInfo));
            } catch (err) {
                // Peer already disconnected, nothing todo...
            }
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
            throw new error.NotAllowed("It is not allow to delete active netcore");
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
            throw new error.Unknown(`Unknown network name: ${netId}`);
        }

        return ni.netCore;
    }

    /**
     * Returns true if netcore with specified id already exist.
     */
    hasNetCore(netId) {
        return this.networks.has(netId);
    }

    /**
     * Connects to peer using netcore identified by 'netId'.
     * 
     * @param {string} netId - network core name
     * @param {PeerInfo|Multiaddr|string|Peer} addr - peer address
     */
    async connect(netId, addr) {
        let peerInfo;
        if (adone.multi.address.isMultiaddr(addr) || is.string(addr)) {
            let ma = addr;
            if (is.string(addr)) {
                ma = adone.multi.address.create(addr);
            }
            const peerIdB58Str = ma.getPeerId();
            if (!peerIdB58Str) {
                throw new Error("Peer multiaddr instance or string must include peerId");
            }
            peerInfo = new PeerInfo(adone.crypto.Identity.createFromBase58(peerIdB58Str));
            peerInfo.multiaddrs.add(ma);
        } else {
            peerInfo = addr;
        }

        try {
            return this.getPeer(peerInfo);
        } catch (err) {
            // fresh peer...
        }

        const netCore = this.getNetCore(netId);
        const peer = new adone.netron2.RemotePeer(PeerInfo.create(peerInfo), this, netCore);
        const protocol = adone.netron2.NETRON_PROTOCOL;
        await peer._setConnInfo(await netCore.connect(peerInfo, protocol));
        await this._peerConnected(peer, protocol);
        return peer;
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
    }

    /**
     * Starts netcore with specified id or all created netcores if 'netId' is undefined.
     * 
     * @param {string} netId network name
     */
    async start(netId) {
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

            netCore.handle(adone.netron2.NETRON_PROTOCOL, async (protocol, conn) => {
                const peerInfo = await conn.getPeerInfo();
                const peer = new adone.netron2.RemotePeer(peerInfo, this, netCore);
                peer._setConnInfo(conn);
                await this._peerConnected(peer, protocol);
            });
        }
    }

    async _peerConnected(peer, protocol) {
        const base58Id = peer.info.id.asBase58();
        this.peers.set(base58Id, peer);
        peer.protocol = protocol;
        peer.connectedTime = new Date();
        await peer.runTask(CONNECT_TASKS);
        await peer._subscribeOnContexts();
        return this._emitOwnEvent("peer:connect", `peer:${base58Id}`, {
            id: base58Id
        });
    }

    async _peerDisconnected(peer) {
        const base58Id = peer.info.id.asBase58();
        this.peers.delete(base58Id);
        peer._setConnInfo(null);

        if (peer._remoteSubscriptions.size > 0) {
            for (const [eventName, fn] of peer._remoteSubscriptions.entries()) {
                this.removeListener(eventName, fn);
            }
            peer._remoteSubscriptions.clear();
        }

        this._peerStubs.delete(base58Id);

        // Release stubs sended to peer;
        for (const [defId, stub] of this._stubs.entries()) {
            const def = stub.definition;
            if (def.peerId === base58Id) {
                this._stubs.delete(defId);
                this._releaseOriginatedContexts(defId);
            }
        }

        peer.interfaces.clear();

        await this._emitOwnEvent("peer:disconnect", `peer:${base58Id}`, {
            id: base58Id
        });
        this._ownEvents.delete(`peer:${base58Id}`);
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
        const base58Id = peerInfo.id.asBase58();
        let stubs = this._peerStubs.get(base58Id);
        if (is.undefined(stubs)) {
            stubs = [];
            this._peerStubs.set(base58Id, stubs);
        }
        let stub = stubs.find((s) => s.instance === obj);
        if (is.undefined(stub)) {
            stub = new Stub(this, obj);
            this._stubs.set(stub.definition.id, stub);
            stubs.push(stub);
        }
        return stub.definition;
    }

    releaseContext(obj, releaseOriginated = true) {
        for (const [defId, stub] of this._stubs.entries()) {
            if (stub.instance === obj) {
                this._stubs.delete(defId);
                releaseOriginated && this._releaseOriginatedContexts(defId, true);
            }
        }

        for (const [uid, stubs] of this._peerStubs.entries()) {
            for (let i = 0; i < stubs.length; i++) {
                const stub = stubs[i];
                if (stub.instance === obj) {
                    stubs.splice(i, 1);
                    if (stubs.length === 0) {
                        this._peerStubs.delete(uid);
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
            throw new error.Exists(`Context '${ctxId}' already attached`);
        }

        return this._attachContext(ctxId, new Stub(this, r));
    }

    /**
     * Detaches before attached context with specified name.
     */
    detachContext(ctxId, releaseOriginated = true) {
        const stub = this.contexts.get(ctxId);
        if (is.undefined(stub)) {
            throw new error.NotExists(`Context '${ctxId}' not exists`);
        }

        this.contexts.delete(ctxId);
        const defId = stub.definition.id;
        releaseOriginated && this._releaseOriginatedContexts(defId);
        this._stubs.delete(defId);
        this._emitOwnEvent("context:detach", `ctx:${ctxId}`, { id: ctxId, defId });
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
            throw new error.Unknown(`Unknown definition '${defId}'`);
        }
        return stub;
    }

    // setInterfaceTwin(ctxClassName, TwinClass) {
    //     if (!is.class(TwinClass)) {
    //         throw new error.InvalidArgument("TwinClass should be a class");
    //     }
    //     if (!is.netronInterface(new TwinClass())) {
    //         throw new error.InvalidArgument("TwinClass should be extended from adone.netron.Interface");
    //     }
    //     const Class = this._localTwins.get(ctxClassName);
    //     if (!is.undefined(Class)) {
    //         throw new error.Exists(`Twin for interface '${ctxClassName}' exists`);
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
        } else if (is.identity(peerId)) {
            base58Id = peerId.asBase58();
        } else if (is.string(peerId)) { // base58
            base58Id = peerId;
        } else {
            throw new error.NotValid(`Invalid type of peer identity: ${adone.meta.typeOf(peerId)}`);
        }

        const peer = this.peers.get(base58Id);
        if (is.undefined(peer)) {
            if (this.peer.info.id.asBase58() === base58Id) {
                return this.peer;
            }
            throw new error.Unknown(`Unknown peer: '${base58Id}'`);
        }
        return peer;
    }

    getPeerForInterface(iInstance) {
        if (!is.netron2Interface(iInstance)) {
            throw new error.NotValid("Object is not a netron interface");
        }

        return this.getPeer(iInstance[__.I_PEERID_SYMBOL]);
    }

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
                    
                    try {
                        if (is.undefined(stub)) {
                            return peer._sendErrorResponse(packet, new error.NotExists(`Context with definition id '${defId}' not exists`));
                        }
                        await peer._sendResponse(packet, await stub.set(name, data[2], peer));
                    } catch (err) {
                        adone.logError(err);
                        if (err.name !== "NetronIllegalState") {
                            try {
                                await peer._sendErrorResponse(packet, normalizeError(err));
                            } catch (err) {
                                adone.logError(err);
                            }
                        }
                    }
                } else {
                    peer._handleResponse(packet);
                }
                break;
            }
            case ACTION.GET: {
                if (packet.getImpulse()) {
                    const data = packet.data;
                    const defId = data[0];
                    const name = data[1];
                    const stub = this._stubs.get(defId);

                    try {
                        if (is.undefined(stub)) {
                            return peer._sendErrorResponse(packet, new error.NotExists(`Context with definition id '${defId}' not exists`));
                        }
                        await peer._sendResponse(packet, await stub.get(name, data[2], peer));
                    } catch (err) {
                        if (err.name !== "NetronIllegalState") {
                            try {
                                await peer._sendErrorResponse(packet, normalizeError(err));
                            } catch (err) {
                                adone.logError(err);
                            }
                        }
                    }
                } else {
                    peer._handleResponse(packet);
                }
                break;
            }
            case ACTION.TASK: {
                if (packet.getImpulse()) {
                    peer._sendResponse(packet, await this._runPeerTask(peer, packet.data));
                } else {
                    peer._handleResponse(packet);
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
                            error: new error.NotExists(`Task '${t.task}' is not exist`)
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
                    adone.log(error);
                    tasksResults[t.task] = {
                        error
                    };
                }));
            }
        }

        await Promise.all(results);
        return tasksResults;
    }

    _attachContext(ctxId, stub) {
        const def = stub.definition;
        const defId = def.id;
        this.contexts.set(ctxId, stub);
        this._stubs.set(defId, stub);
        this._emitOwnEvent("context:attach", `ctx:${ctxId}`, {
            id: ctxId,
            def
        });
        return defId;
    }

    async _emitOwnEvent(event, id, data) {
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
            try {
                await this.emitParallel(eventName, data); // eslint-disable-line
            } catch (err) {
                adone.logError(err);
            }

            if (is.undefined(events.shift())) {
                break;
            }
        }
    }
}
tag.add(Netron, "NETRON2");
