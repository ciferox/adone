const { is, x, util, configuration: { Configuration }, event: { AsyncEmitter } } = adone;
const { TimedoutMap } = adone.collection;
const { STATUS, ACTION, RemoteStub, GenesisNetron, SequenceId, Stream } = adone.netron;

export default class GenesisPeer extends AsyncEmitter {
    constructor(options = {}) {
        super();
        this.options = new Configuration();
        this.options.assign({
            protocol: "netron:",
            retryTimeout: 100,
            retryMaxTimeout: 10000,
            reconnects: 3
        }, options);

        this.netron = this.options.netron;
        this.streamId = new SequenceId();
        this._responseAwaiters = new TimedoutMap(this.options.responseTimeout, (streamId) => {
            const awaiter = this._removeAwaiter(streamId);
            awaiter([1, new x.NetronTimeout(`Response timeout ${this.options.responseTimeout}ms exceeded`)]);
        });
        this._status = STATUS.OFFLINE;
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

        this._onRemoteContextAttach = (peer, ctxData) => {
            const def = {};
            def[ctxData.id] = ctxData.def;
            this._updateStrongDefinitions(def);
        };

        this._onRemoteContextDetach = (peer, ctxData) => {
            this._ctxidDefs.delete(ctxData.id);
            this._defs.delete(ctxData.defId);
        };
    }

    connect(/*options*/) {
        throw new x.NotImplemented("Method connect() should be implemented");
    }

    disconnect() {
        throw new x.NotImplemented("Method disconnect() should be implemented");
    }

    isConnected() {
        throw new x.NotImplemented("Method isConnected() should be implemented");
    }

    write(/*data*/) {
        throw new x.NotImplemented("Method write() should be implemented");
    }

    getStatus() {
        return this._status;
    }

    async createStream({ remoteStreamId = 0, highWaterMark = 16, allowHalfOpen = true } = {}) {
        let stream;

        if (remoteStreamId === 0) {
            // initiator side -> outgoing stream
            const id = this.streamId.next();
            stream = new Stream({ peer: this, id, highWaterMark, allowHalfOpen });
            try {
                await this.netron.send(this, 1, this.streamId.next(), 1, ACTION.STREAM_REQUEST, id);
                this._requestedStreams.set(stream.id, stream);
            } catch (err) {
                throw err;
            }
        } else {
            // acceptor side -> incomming stream
            if (!this._awaitingStreamIds.has(remoteStreamId)) {
                throw new x.NotExists("No awaiting stream with such id");
            }

            const id = this.streamId.next();
            stream = new Stream({ peer: this, id, highWaterMark, allowHalfOpen });
            try {
                await this.netron.send(this, 1, this.streamId.next(), 1, ACTION.STREAM_ACCEPT, { origin: remoteStreamId, remote: id });
                this._awaitingStreamIds.delete(remoteStreamId);
                this._enableStream(stream, remoteStreamId);
            } catch (err) {
                throw err;
            }
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

    _setStatus(status) {
        if (status >= 0 && status < STATUS.MAX && status !== this._status) {
            if (this._status === STATUS.ONLINE && status === STATUS.OFFLINE) {
                for (const awaiter of this._responseAwaiters.values()) { // reject all the pending get requests
                    awaiter([1, new x.NetronPeerDisconnected()]);
                }
            }
            this._status = status;
            if (status === STATUS.OFFLINE) {
                this._responseAwaiters.clear();
            } else if (status === STATUS.ONLINE) {
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

    async _subscribe() {
        await this.netron.onRemote(this.uid, "context attach", this._onRemoteContextAttach);
        await this.netron.onRemote(this.uid, "context detach", this._onRemoteContextDetach);
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
        const streamId = packet[GenesisNetron._DATA];
        this._awaitingStreamIds.add(streamId);
    }

    _streamAccepted(packet) {
        const streamIds = packet[GenesisNetron._DATA];
        const stream = this._requestedStreams.get(streamIds.origin);
        if (!is.undefined(stream)) {
            this._requestedStreams.delete(stream.id);
            this._enableStream(stream, streamIds.remote);
            stream._remoteAccepted(streamIds.remote);
        }
    }

    _streamProcessData(packet) {
        const stream = this._getStreamFromPacket(packet);
        stream && stream._push(packet[GenesisNetron._DATA], packet[GenesisNetron._PACKET_ID]);
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
        stream && stream._remoteEnd(packet[GenesisNetron._PACKET_ID]);
    }

    _getStreamFromPacket(packet) {
        const streamId = packet[GenesisNetron._STREAM_ID];
        const stream = this._streams.get(streamId);
        if (is.undefined(stream)) {
            return adone.log(`No local stream associated with remote stream id: ${streamId}`);
        }
        return stream;
    }
}
adone.tag.set(GenesisPeer, adone.tag.GENESIS_PEER);
