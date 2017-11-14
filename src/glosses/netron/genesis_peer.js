const {
    is,
    x,
    util,
    event: { AsyncEmitter },
    collection: { TimedoutMap },
    netron: { PEER_STATUS, ACTION, RemoteStub, SequenceId, Stream }
} = adone;

export default class GenesisPeer extends AsyncEmitter {
    constructor(options) {
        super();
        this.options = Object.assign({}, options);

        this.netron = this.options.netron;
        this.streamId = new SequenceId();
        this._responseAwaiters = new TimedoutMap(this.options.responseTimeout, (streamId) => {
            const awaiter = this._removeAwaiter(streamId);
            awaiter([1, new x.NetronTimeout(`Response timeout ${this.options.responseTimeout}ms exceeded`)]);
        });
        this._status = PEER_STATUS.OFFLINE;
        this._defs = new Map();
        this._ctxidDefs = new Map();
        this._ownDefIds = []; // super netron specific

        // Requested/local streams.
        this._requestedStreams = new Map();
        // Map of remote stream id and associated local stream.
        this._streams = new Map();
        // IDs of remote awaiting streams.
        this._awaitingStreamIds = new Set();

        this.uid = null;
        this.connectedTime = null;
    }

    connect(/*options*/) {
        throw new x.NotImplemented("Method connect() is not implemented");
    }

    disconnect() {
        throw new x.NotImplemented("Method disconnect() is not implemented");
    }

    isConnected() {
        throw new x.NotImplemented("Method isConnected() is not implemented");
    }

    write(/*data*/) {
        throw new x.NotImplemented("Method write() is not implemented");
    }

    getRemoteAddress() {
        throw new x.NotImplemented("Method getRemoteAddress() is not implemented");
    }

    getStatus() {
        return this._status;
    }

    async requestStream({ highWaterMark = 16, allowHalfOpen = true } = {}) {
        const id = this.streamId.next();
        const stream = new Stream({
            peer: this,
            id,
            highWaterMark,
            allowHalfOpen
        });
        try {
            await this.netron.send(this, 1, this.streamId.next(), 1, ACTION.STREAM_REQUEST, id);
            this._requestedStreams.set(stream.id, stream);
        } catch (err) {
            throw err;
        }
        return stream;
    }

    async acceptStream({ remoteStreamId, highWaterMark = 16, allowHalfOpen = true } = {}) {
        // acceptor side -> incomming stream
        if (!this._awaitingStreamIds.has(remoteStreamId)) {
            throw new x.NotExists("No awaiting stream with such id");
        }

        const id = this.streamId.next();
        const stream = new Stream({
            peer: this,
            id,
            highWaterMark,
            allowHalfOpen
        });
        try {
            await this.netron.send(this, 1, this.streamId.next(), 1, ACTION.STREAM_ACCEPT, { origin: remoteStreamId, remote: id });
            this._awaitingStreamIds.delete(remoteStreamId);
            this._enableStream(stream, remoteStreamId);
        } catch (err) {
            throw err;
        }

        return stream;
    }

    set(defId, name, data) {
        const ctxDef = this._defs.get(defId);
        if (is.undefined(ctxDef)) {
            return Promise.reject(new x.Unknown(`Unknown definition '${defId}'`));
        }

        let $ = ctxDef.$;
        if (name in $) {
            $ = $[name];
            if (!$.method && $.readonly) {
                return Promise.reject(new x.InvalidAccess(`'${name}' is not writable`));
            }
            data = this._processArgs(ctxDef, $, data);
            return this.netron.send(this, 1, this.streamId.next(), 1, ACTION.SET, [defId, name, data]);
        }
        return Promise.reject(new x.NotExists(`'${name}' not exists`));
    }

    get(defId, name, defaultData) {
        const ctxDef = this._defs.get(defId);
        if (is.undefined(ctxDef)) {
            return Promise.reject(new x.Unknown(`Unknown definition '${defId}'`));
        }

        let $ = ctxDef.$;
        if (name in $) {
            $ = $[name];
            defaultData = this._processArgs(ctxDef, $, defaultData);
            return new Promise((resolve, reject) => {
                this.netron.send(this, 1, this.streamId.next(), 1, ACTION.GET, [defId, name, defaultData], (result) => {
                    if (result[0] === 1) {
                        reject(result[1]);
                    } else {
                        resolve(this._processResult(ctxDef, result[1]));
                    }
                }).catch(reject);
            });
        }
        return Promise.reject(new x.NotExists(`'${name}' not exists`));
    }

    ping() {
        return this.netron.ping(this.uid);
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

    getDefinitionByName(ctxId) {
        return this._ctxidDefs.get(ctxId);
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
                this.netron.nuidPeerMap.set(this.uid, this);
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

    _getRequestedStreamById(streamId) {
        return this._requestedStreams.get(streamId);
    }

    _getAwaitingStreams() {
        return [...this._requestedStreams.values()];
    }

    _getRequestedStreamIds() {
        return [...this._awaitingStreamIds.values()];
    }

    _enableStream(stream, remoteStreamId) {
        stream.remoteId = remoteStreamId;
        this._streams.set(remoteStreamId, stream);
    }

    _streamRequested(packet) {
        const streamId = packet.data;
        this._awaitingStreamIds.add(streamId);
    }

    _streamAccepted(packet) {
        const streamIds = packet.data;
        const stream = this._requestedStreams.get(streamIds.origin);
        if (!is.undefined(stream)) {
            this._requestedStreams.delete(stream.id);
            this._enableStream(stream, streamIds.remote);
            stream._remoteAccepted(streamIds.remote);
        }
    }

    _streamData(packet) {
        const stream = this._getStreamFromPacket(packet);
        stream && stream._push(packet.data, packet.id);
    }

    _streamPause(packet) {
        const stream = this._getStreamFromPacket(packet);
        stream && stream._receivePause();
    }

    _streamResume(packet) {
        const stream = this._getStreamFromPacket(packet);
        stream && stream._receiveResume();
    }

    _streamEnd(packet) {
        const stream = this._getStreamFromPacket(packet);
        stream && stream._remoteEnd(packet.id);
    }

    _getStreamFromPacket(packet) {
        const stream = this._streams.get(packet.streamId);
        if (is.undefined(stream)) {
            return adone.log(`No local stream associated with remote stream id: ${packet.streamId}`);
        }
        return stream;
    }
}
adone.tag.add(GenesisPeer, "GENESIS_PEER");
