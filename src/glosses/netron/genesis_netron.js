const {
    is,
    x,
    util,
    net,
    event: { AsyncEmitter },
    netron: {
        DEFAULT_PORT,
        ACTION,
        STATUS,
        Reference,
        Interface,
        Stub,
        Reflection,
        Definitions,
        SequenceId,
        Packet
    }
} = adone;

export default class GenesisNetron extends AsyncEmitter {
    constructor(options) {
        super();

        this.uid = util.uuid.v4();
        this.options = Object.assign({
            protocol: "netron:",
            defaultPort: DEFAULT_PORT,
            responseTimeout: 60000 * 3,
            isSuper: false,
            acceptTwins: true,
            transpiler: {
                plugins: [
                    "transform.asyncToGenerator"
                ],
                compact: false
            }
        }, options);

        this.options.connect = Object.assign({
            retries: 3,
            minTimeout: 300,
            maxTimeout: 3000
        }, options ? options.connect : null);

        this.piStatuses = [STATUS.HANDSHAKING, STATUS.ONLINE];

        this._ownPeer = null;
        this._svrNetronAddrs = new Map();
        this.nuidPeerMap = new Map();
        this._peerEvents = new Map();
        this._remoteEvents = new Map();
        this._remoteListeners = new Map();
        this._contextEvents = new Map();
        this.contexts = new Map();
        this._stubs = new Map();
        this._nuidStubs = new Map();
        this._interfaces = new Map();
        this.uniqueDefId = new SequenceId();
        this._localTwins = new Map();

        this.setMaxListeners(Infinity);
    }

    getOwnPeer() {
        if (is.null(this._ownPeer)) {
            this._ownPeer = new adone.netron.OwnPeer({
                netron: this
            });
        }
        return this._ownPeer;
    }

    connect(options = {}) {
        if (is.null(options)) {
            return this.getOwnPeer();
        }
        const [port, host] = net.util.normalizeAddr(options.port, options.host, this.options.defaultPort);
        const addr = net.util.humanizeAddr(this.options.protocol, port, host);
        const peer = this._svrNetronAddrs.get(addr);
        if (!is.undefined(peer)) {
            return Promise.resolve(peer);
        }
        const p = new Promise(async (resolve, reject) => {
            try {
                let hsStatus = null;
                const peer = this._createPeer();
                this._emitPeerEvent("peer create", peer);
                peer.on("disconnect", async () => {
                    this._svrNetronAddrs.delete(addr);
                    await this._peerDisconnected(peer);
                    if (is.null(hsStatus)) {
                        reject(new x.Connect(`Peer ${addr} refused connection`));
                    }
                });
                peer._setStatus(STATUS.CONNECTING);
                await peer.connect(Object.assign({}, options, { port, host }));
                this._svrNetronAddrs.set(addr, peer);
                peer._setStatus(STATUS.HANDSHAKING);
                this._emitPeerEvent("peer connect", peer);
                await this.send(peer, 1, peer.streamId.next(), 1, ACTION.GET, this.onSendHandshake(peer), async (payload) => {
                    try {
                        const data = payload.data;
                        if (!is.plainObject(data)) {
                            throw new adone.x.NotValid(`Not valid packet: ${typeof (data)}`);
                        }
                        this._onReceiveInitial(peer, data);
                        peer._setStatus(STATUS.ONLINE);
                        this._emitPeerEvent("peer online", peer);
                        await peer.connected();
                        hsStatus = 1;
                        resolve(peer);
                    } catch (err) {
                        peer.disconnect();
                        hsStatus = 0;
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
        return p;
    }

    disconnect(uid) {
        if (is.nil(uid)) {
            const promises = [];
            for (const uid of this.nuidPeerMap.keys()) {
                promises.push(this.disconnect(uid));
            }
            return Promise.all(promises);
        }
        return this.getPeer(uid).disconnect();
    }

    refContext(uid, obj) {
        let stubs = this._nuidStubs.get(uid);
        if (is.undefined(stubs)) {
            stubs = [];
            this._nuidStubs.set(uid, stubs);
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

    releaseContext(obj, releaseOriginated = true) {
        for (const [defId, stub] of this._stubs.entries()) {
            if (stub.instance === obj) {
                this._stubs.delete(defId);
                releaseOriginated && this._releaseOriginatedContexts(defId, true);
            }
        }

        for (const [uid, stubs] of this._nuidStubs.entries()) {
            for (let i = 0; i < stubs.length; i++) {
                const stub = stubs[i];
                if (stub.instance === obj) {
                    stubs.splice(i, 1);
                    if (stubs.length === 0) {
                        this._nuidStubs.delete(uid);
                    }
                    break;
                }
            }
        }
    }

    releaseInterface(iObj) {
        if (!is.netronInterface(iObj)) {
            throw new x.InvalidArgument("Argument is not an interface");
        }
        for (const [hash, i] of this._interfaces.entries()) {
            if (i.$def.id === iObj.$def.id && i.$uid === iObj.$uid) {
                this._interfaces.delete(hash);
                break;
            }
        }
    }

    attachContext(instance, ctxId = null) {
        const r = Reflection.from(instance);

        if (is.null(ctxId)) {
            ctxId = instance.__proto__.constructor.name;
        }
        if (this.contexts.has(ctxId)) {
            throw new x.Exists(`Context '${ctxId}' already attached`);
        }

        return this._attachContext(ctxId, new Stub(this, instance, r));
    }

    detachContext(ctxId, releaseOriginted = true) {
        const stub = this.contexts.get(ctxId);
        if (!is.undefined(stub)) {
            this.contexts.delete(ctxId);
            const defId = stub.definition.id;
            releaseOriginted && this._releaseOriginatedContexts(defId);
            this._stubs.delete(defId);
            this._emitContextEvent("context detach", { id: ctxId, defId });
            return defId;
        }
        throw new x.Unknown(`Unknown context '${ctxId}'`);
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

    getDefinitionByName(ctxId, uid = null) {
        if (is.nil(uid)) {
            const stub = this.contexts.get(ctxId);
            if (is.undefined(stub)) {
                throw new x.Unknown(`Unknown context '${ctxId}'`);
            }
            return stub.definition;
        }
        return this.getPeer(uid).getDefinitionByName(ctxId);

    }

    getInterfaceByName(ctxId, uid = null) {
        if (is.nil(uid)) {
            const def = this.getDefinitionByName(ctxId);
            return this.getInterfaceById(def.id);
        }
        return this.getPeer(uid).getInterfaceByName(ctxId);
    }

    getInterface(ctxId, uid) {
        return this.getInterfaceByName(ctxId, uid);
    }

    async attachContextRemote(uid, instance, ctxId = null) {
        const peer = this.getPeer(uid);
        if (!peer.isSuper) {
            throw new x.Unknown(`Peer '${uid}' is not a super-netron`);
        }
        const r = Reflection.from(instance);
        if (is.null(ctxId)) {
            ctxId = instance.__proto__.constructor.name;
        }
        const defId = peer._attachedContexts.get(ctxId);
        if (!is.undefined(defId)) {
            throw new x.Exists(`Context '${ctxId}' already attached on the peer '${uid}' side`);
        }

        const stub = new Stub(this, instance, r);
        const def = stub.definition;
        this._stubs.set(def.id, stub);
        peer._attachedContexts.set(ctxId, def.id);
        return new Promise((resolve, reject) => {
            this.send(peer, 1, peer.streamId.next(), 1, ACTION.CONTEXT_ATTACH, { id: ctxId, def }, resolve).catch(reject);
        });
    }

    async detachContextRemote(uid, ctxId) {
        const peer = this.getPeer(uid);
        if (!peer.isSuper) {
            throw new x.Unknown(`Peer '${uid}' is not a super-netron`);
        }
        const defId = peer._attachedContexts.get(ctxId);
        if (is.undefined(defId)) {
            throw new x.NotExists(`Context '${ctxId}' not attached on the peer '${uid}' code`);
        }
        this._stubs.delete(defId);
        peer._attachedContexts.delete(ctxId);
        return new Promise((resolve, reject) => {
            this.send(peer, 1, peer.streamId.next(), 1, ACTION.CONTEXT_DETACH, ctxId, resolve).catch(reject);
        });
    }

    setInterfaceTwin(ctxClassName, TwinClass) {
        if (!is.class(TwinClass)) {
            throw new x.InvalidArgument("TwinClass should be a class");
        }
        if (!is.netronInterface(new TwinClass())) {
            throw new x.InvalidArgument("TwinClass should be extended from adone.netron.Interface");
        }
        const Class = this._localTwins.get(ctxClassName);
        if (!is.undefined(Class)) {
            throw new x.Exists(`Twin for interface '${ctxClassName}' exists`);
        }
        this._localTwins.set(ctxClassName, TwinClass);
    }

    send(peer, impulse, streamId, packetId, action, data, awaiter) {
        const status = peer.getStatus();
        if (this.piStatuses.includes(status)) {
            if (is.function(awaiter)) {
                peer._setAwaiter(streamId, awaiter);
            }

            return peer.write(Packet.create(packetId, streamId, impulse, action, status, data).raw);
        }
        return Promise.reject(new x.NetronIllegalState(`Cannot send data (peer status is ${this.getStatusName(status)})`));
    }

    set(uid, defId, name, data) {
        if (is.nil(uid)) {
            const stub = this._stubs.get(defId);
            if (is.undefined(stub)) {
                return Promise.reject(new x.NotExists(`Context with definition id '${defId}' not exists`));
            }
            return stub.set(name, data);
        }
        return this.getPeer(uid).set(defId, name, data);

    }

    get(uid, defId, name, defaultData) {
        if (is.nil(uid)) {
            const stub = this._stubs.get(defId);
            if (is.undefined(stub)) {
                return Promise.reject(new x.NotExists(`Context with definition id '${defId}' not exists`));
            }
            return new Promise((resolve, reject) => {
                stub.get(name, defaultData).catch(reject).then((result) => {
                    if (is.netronDefinition(result)) {
                        resolve(this._createInterface(result));
                    } else {
                        resolve(result);
                    }
                });
            });
        }
        return this.getPeer(uid).get(defId, name, defaultData);

    }

    call(uid, defId, method, ...args) {
        return this.get(uid, defId, method, args);
    }

    callVoid(uid, defId, method, ...args) {
        return this.set(uid, defId, method, args);
    }

    async ping(uid) {
        if (is.nil(uid)) {
            return null;
        }
        const peer = this.getPeer(uid);
        return new Promise((resolve, reject) => {
            this.send(peer, 1, peer.streamId.next(), 1, ACTION.PING, null, resolve).catch(reject);
        });
    }

    getPeer(uid) {
        if (is.nil(uid)) {
            throw new x.InvalidArgument("Invalid peer or peer uid");
        }
        const peer = is.genesisPeer(uid) ? uid : this.nuidPeerMap.get(uid);
        if (is.genesisPeer(peer)) {
            return peer;
        }
        throw new x.Unknown(`Unknown peer '${uid}'`);

    }

    getPeerForInterface(int) {
        if (!is.netronInterface(int)) {
            throw new x.InvalidArgument("Object is not a netron interface");
        } else {
            return this.getPeer(int.$uid);
        }
    }

    getPeers() {
        return this.nuidPeerMap;
    }

    getStubById(defId) {
        return this._stubs.get(defId);
    }

    getInterfaceById(defId, uid = null) {
        if (is.nil(uid)) {
            if (!this._stubs.has(defId)) {
                throw new x.Unknown(`Unknown definition '${defId}'`);
            }
            return this._createInterface(this._stubs.get(defId).definition);
        }
        return this.getPeer(uid).getInterfaceById(defId);

    }

    async onRemote(uid, eventName, handler) {
        if (is.nil(uid)) {
            const promises = [];
            for (const uid of this.nuidPeerMap.keys()) {
                promises.push(this.onRemote(uid, eventName, handler));
            }
            return Promise.all(promises);
        }
        const peer = this.getPeer(uid);
        let events = this._remoteEvents.get(uid);
        if (is.undefined(events)) {
            events = new Map();
            events.set(eventName, [handler]);
            this._remoteEvents.set(uid, events);
            await (new Promise((resolve, reject) => {
                this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_ON, eventName, resolve).catch(reject);
            }));
        } else {
            const handlers = events.get(eventName);
            if (is.undefined(handlers)) {
                events.set(eventName, [handler]);
                await (new Promise((resolve, reject) => {
                    this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_ON, eventName, resolve).catch(reject);
                }));
            } else {
                handlers.push(handler);
            }
        }

    }

    async offRemote(uid, eventName, listener) {
        if (is.nil(uid)) {
            const promises = [];
            for (const uid of this.nuidPeerMap.keys()) {
                promises.push(this.offRemote(uid, eventName, listener));
            }
            return Promise.all(promises);
        }
        const peer = this.getPeer(uid);
        const events = this._remoteEvents.get(uid);
        if (!is.undefined(events)) {
            const listeners = events.get(eventName);
            if (!is.undefined(listeners)) {
                const index = listeners.indexOf(listener);
                if (index >= 0) {
                    listeners.splice(index, 1);
                    if (listeners.length === 0) {
                        events.delete(eventName);
                        await (new Promise((resolve, reject) => {
                            this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_OFF, eventName, resolve).catch(reject);
                        }));
                    }
                }
            }
        }
    }

    onSendHandshake(/*peer*/) {
        return {
            uid: this.uid
        };
    }

    _onReceiveInitial(peer, data) {
        peer.isSuper = Boolean(data.isSuper);
        if (peer.isSuper) {
            peer._attachedContexts = new Map();
        }
        peer.uid = data.uid;
        if (is.propertyDefined(data, "defs")) {
            peer._updateStrongDefinitions(data.defs);
        }
    }

    async _peerDisconnected(peer) {
        if (!is.null(peer.uid)) {
            this.nuidPeerMap.delete(peer.uid);
        }
        peer._setStatus(STATUS.OFFLINE);
        const listeners = this._remoteListeners.get(peer.uid);
        if (!is.undefined(listeners)) {
            for (const [eventName, fn] of listeners.entries()) {
                this.removeListener(eventName, fn);
            }
        }
        this._remoteListeners.delete(peer.uid);
        this._nuidStubs.delete(peer.uid);

        // Release stubs sended to peer;
        for (const [defId, stub] of this._stubs.entries()) {
            const def = stub.definition;
            if (def.uid === peer.uid) {
                this._stubs.delete(defId);
                this._releaseOriginatedContexts(defId);
            }
        }

        // Release interfaces obtained from peer
        for (const [hash, i] of this._interfaces.entries()) {
            if (i.$uid === peer.uid) {
                this._interfaces.delete(hash);
            }
        }

        await this._emitPeerEvent("peer offline", peer);
        this._peerEvents.delete(peer);
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

    // _removePeersRelatedDefinitions(exceptPeer, proxyDef) {
    //     for (let peer of this.nuidPeerMap.values()) {
    //         if (peer.uid !== exceptPeer.uid) {
    //             peer._removeRelatedDefinitions(proxyDef);
    //         }
    //     }
    // }

    customProcessPacket(peer, packet) {
    }

    async _processPacket(peer, rawPacket) {
        let packet;
        try {
            packet = Packet.from(rawPacket);
        } catch (err) {
            return adone.error(err.message);
        }

        const action = packet.getAction();
        const status = packet.getStatus();

        switch (action) {
            case ACTION.SET: {
                switch (status) {
                    case STATUS.HANDSHAKING: {
                        if (!packet.getImpulse()) {
                            const awaiter = peer._removeAwaiter(packet.streamId);
                            !is.undefined(awaiter) && awaiter(packet);
                        } else {
                            adone.error("Illegal `impulse` flag (1) during handshake response");
                        }
                        return;
                    }
                    case STATUS.ONLINE: {
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
                        return;
                    }
                    default: {
                        adone.error(`Unknown peer status: ${status}`);
                    }
                }
                break;
            }
            case ACTION.GET: {
                switch (status) {
                    case STATUS.HANDSHAKING: {
                        if (!packet.getImpulse()) {
                            peer.disconnect();
                            adone.error("Flag `impulse` cannot be zero during request of handshake");
                        } else {
                            await this.customProcessPacket(peer, packet);
                        }
                        return;
                    }
                    case STATUS.ONLINE: {
                        const data = packet.data;
                        const defId = data[0];
                        const name = data[1];
                        const stub = this._stubs.get(defId);

                        try {
                            if (is.undefined(stub)) {
                                return this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, new x.NotExists("Context not exists")]);
                            }
                            const result = await stub.get(name, data[2], peer);
                            await this.send(peer, 0, packet.streamId, 1, ACTION.SET, [0, result]);
                        } catch (err) {
                            adone.error(err);
                            if (err.name !== "NetronIllegalState") {
                                try {
                                    await this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, err]);
                                } catch (err) {
                                    adone.error(err);
                                }
                            }
                        }
                        return;
                    }
                }
                break;
            }
        }

        if (status !== STATUS.ONLINE) {
            const result = await this.customProcessPacket(peer, packet);
            if (!result) {
                adone.error(`${peer.uid} attempts '${action}' action with status ${this.getStatusName(status)}`);
            }
            return;
        }

        // status = ONLINE

        switch (action) {
            case ACTION.PING: {
                if (packet.getImpulse()) {
                    try {
                        await this.send(peer, 0, packet.streamId, 1, ACTION.PING, null);
                    } catch (err) {
                        adone.error(err);
                    }
                } else { // reply
                    const awaiter = peer._removeAwaiter(packet.streamId);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            case ACTION.CONTEXT_ATTACH: {
                if (packet.getImpulse()) {
                    if ((await this.customProcessPacket(peer, packet)) === false) {
                        return this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, new x.NotImplemented("This feature is not implemented")]);
                    }
                } else { // reply
                    const awaiter = peer._removeAwaiter(packet.streamId);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            case ACTION.CONTEXT_DETACH: {
                if (packet.getImpulse()) {
                    if ((await this.customProcessPacket(peer, packet)) === false) {
                        return this.send(peer, 0, packet.streamId, 1, ACTION.SET, [1, new x.NotImplemented("This feature is not implemented")]);
                    }
                } else { // reply
                    const awaiter = peer._removeAwaiter(packet.streamId);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            case ACTION.EVENT_ON: {
                if (packet.getImpulse()) {
                    const eventName = packet.data;
                    const fn = (...args) => {
                        if (this.options.isSuper) {
                            if (!is.undefined(peer._ownDefIds)) {
                                if (peer._ownDefIds.includes(args[0].defId)) {
                                    return;
                                }
                            }
                        }
                        return new Promise((resolve, reject) => {
                            this.send(peer, 1, peer.streamId.next(), 1, ACTION.EVENT_EMIT, [eventName].concat(args), resolve).catch(reject);
                        });
                    };
                    //this._emitRemote.bind(this, peer, eventName);
                    const listeners = this._remoteListeners.get(peer.uid);
                    if (is.undefined(listeners)) {
                        const map = new Map();
                        map.set(eventName, fn);
                        this._remoteListeners.set(peer.uid, map);
                    } else if (!listeners.has(eventName)) {
                        listeners.set(eventName, fn);
                    }
                    this.on(eventName, fn);
                    try {
                        await this.send(peer, 0, packet.streamId, 1, ACTION.EVENT_ON, eventName);
                    } catch (err) {
                        adone.error(err);
                    }
                } else { // reply
                    const awaiter = peer._removeAwaiter(packet.streamId);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            case ACTION.EVENT_OFF: {
                if (packet.getImpulse()) {
                    const data = packet.data;
                    const eventName = data[0];
                    const listeners = this._remoteListeners.get(peer.uid);
                    if (!is.undefined(listeners)) {
                        const fn = listeners.get(eventName);
                        if (!is.undefined(fn)) {
                            this.removeListener(eventName, fn);
                            listeners.delete(eventName);
                            if (listeners.size === 0) {
                                this._remoteListeners.delete(peer.uid);
                            }
                        }
                    }
                    try {
                        await this.send(peer, 0, packet.streamId, 1, ACTION.EVENT_OFF, eventName);
                    } catch (err) {
                        adone.error(err);
                    }
                } else { // reply
                    const awaiter = peer._removeAwaiter(packet.streamId);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            case ACTION.EVENT_EMIT: {
                if (packet.getImpulse()) {
                    const args = packet.data;
                    const eventName = args.shift();
                    args.unshift(peer);
                    const events = this._remoteEvents.get(peer.uid);
                    if (!is.undefined(events)) {
                        const handlers = events.get(eventName);
                        if (!is.undefined(handlers)) {
                            const promises = [];
                            for (const fn of handlers) {
                                promises.push(Promise.resolve(fn.apply(this, args)));
                            }
                            try {
                                await Promise.all(promises).then(() => {
                                    return this.send(peer, 0, packet.streamId, 1, ACTION.EVENT_EMIT);
                                });
                            } catch (err) {
                                adone.error(err);
                            }
                        }
                    }
                } else { // reply
                    const awaiter = peer._removeAwaiter(packet.streamId);
                    !is.undefined(awaiter) && awaiter(packet.data);
                }
                break;
            }
            case ACTION.STREAM_REQUEST: {
                if (packet.getImpulse()) {
                    peer._streamRequested(packet);
                }
                break;
            }
            case ACTION.STREAM_ACCEPT: {
                if (packet.getImpulse()) {
                    peer._streamAccepted(packet);
                }
                break;
            }
            case ACTION.STREAM_DATA: {
                peer._streamProcessData(packet);
                break;
            }
            case ACTION.STREAM_PAUSE: {
                peer._streamPause(packet);
                break;
            }
            case ACTION.STREAM_RESUME: {
                peer._streamResume(packet);
                break;
            }
            case ACTION.STREAM_END: {
                peer._streamEnd(packet);
                break;
            }
            default:
                await this.customProcessPacket(peer, packet);
                break;
        }
    }

    _createPeer(socket, gate, peerType) {
        throw new x.NotImplemented("Method _createPeer() should be implemented");
    }

    _createInterface(def, uid = null) {
        const defId = def.id;
        const hash = `${uid}:${defId}`;
        let anInterface = this._interfaces.get(hash);
        if (!is.undefined(anInterface)) {
            return anInterface;
        }

        // Заготовка под создаваемый интерфейс.
        class XInterface extends Interface { }

        const proto = XInterface.prototype;

        for (const [key, meta] of util.entries(def.$, { all: true })) {
            if (meta.method) {
                const method = (...args) => {
                    this._processArgs(uid, args, true);
                    return this.get(uid, defId, key, args);
                };
                method.void = (...args) => {
                    this._processArgs(uid, args, true);
                    return this.set(uid, defId, key, args);
                };
                proto[key] = method;
            } else {
                const propMethods = {};
                propMethods.get = (defaultValue) => {
                    defaultValue = this._processArgs(uid, defaultValue, false);
                    return this.get(uid, defId, key, defaultValue);
                };
                if (!meta.readonly) {
                    propMethods.set = (value) => {
                        value = this._processArgs(uid, value, false);
                        return this.set(uid, defId, key, value);
                    };
                }
                proto[key] = propMethods;
            }
        }

        anInterface = new XInterface(def, uid);

        if (!is.undefined(def.twin)) {
            let twinCode;
            if (!is.string(def.twin) && is.string(def.twin.node)) {
                twinCode = def.twin.node;
            } else {
                twinCode = def.twin;
            }

            if (is.string(twinCode)) {
                const wrappedCode = `
                    (function() {
                        return ${twinCode};
                    })();`;

                const taskClassScript = adone.std.vm.createScript(adone.js.compiler.core.transform(wrappedCode, this.options.transpiler).code, { filename: def.name, displayErrors: true });
                const scriptOptions = {
                    displayErrors: true,
                    breakOnSigint: false
                };

                const TwinInterface = taskClassScript.runInThisContext(scriptOptions);
                if (is.netronInterface(new TwinInterface())) {
                    class XTwin extends TwinInterface { }
                    const twinProto = XTwin.prototype;
                    const twinMethods = util.keys(twinProto, { all: true });
                    for (const [name, prop] of util.entries(XInterface.prototype, { all: true })) {
                        if (!twinMethods.includes(name)) {
                            twinProto[name] = prop;
                        }
                    }

                    const twinInterface = new XTwin();
                    twinInterface.$twin = anInterface;
                    this._interfaces.set(hash, twinInterface);
                    return twinInterface;
                }
            }
        } else if (this._localTwins.has(def.name)) {
            const TwinInterface = this._localTwins.get(def.name);
            if (!is.undefined(TwinInterface)) {
                class XTwin extends TwinInterface { }
                const twinProto = XTwin.prototype;
                const twinMethods = util.keys(twinProto, { all: true });
                for (const [name, prop] of util.entries(XInterface.prototype, { all: true })) {
                    if (!twinMethods.includes(name)) {
                        twinProto[name] = prop;
                    }
                }

                const twinInterface = new XTwin();
                twinInterface.$twin = anInterface;
                this._interfaces.set(hash, twinInterface);
                return twinInterface;
            }
        }

        this._interfaces.set(hash, anInterface);
        return anInterface;
    }

    _processArgs(uid, args, isMethod) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                args[i] = this._processObject(uid, args[i]);
            }
        } else {
            return this._processObject(uid, args);
        }
    }

    _processObject(uid, obj) {
        if (is.netronInterface(obj)) {
            return new Reference(obj.$def.id);
        } else if (is.netronContext(obj)) {
            const def = this.refContext(uid, obj);
            def.uid = uid; // definition owner uid
            return def;
        } else if (is.netronDefinitions(obj)) {
            const newDefs = new Definitions();
            for (let i = 0; i < obj.length; i++) {
                newDefs.push(this._processObject(uid, obj.get(i)));
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
        this._emitContextEvent("context attach", { id: ctxId, defId, def });
        return defId;
    }

    async _emitContextEvent(event, ctxData) {
        let events = this._contextEvents.get(ctxData.id);
        if (is.undefined(events)) {
            events = [event];
            this._contextEvents.set(ctxData.id, events);
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
                await this.emitParallel(event, ctxData);
            } catch (err) {
                adone.error(err);
            }
            events.splice(0, 1);
        }
    }

    _proxifyContext(ctxId, stub) {
        const def = stub.definition;
        const defId = def.id;
        this._stubs.set(defId, stub);
        return defId;
    }

    async _emitPeerEvent(event, peer) {
        let events = this._peerEvents.get(peer);
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
adone.tag.add(GenesisNetron, "GENESIS_NETRON");
