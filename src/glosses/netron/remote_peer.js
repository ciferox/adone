const {
    is,
    collection: { TimeMap },
    netron: { ACTION, AbstractPeer, packet, uid: { FastUid }, Reference },
    stream: { pull },
    error
} = adone;

const ON_CONNECT_TASKS = ["netronGetConfig", "netronGetContextDefs"];
const HEADER_BUFFER = Buffer.alloc(4);

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


export default class RemotePeer extends AbstractPeer {
    constructor(options) {
        super(options);

        this._writer = null;
        // this.protocol = null;
        this.connectedTime = null;

        this._packetUid = new FastUid();
        this._responseHandlers = new TimeMap(this.netron.options.responseTimeout, (id) => {
            const handler = this._deleteHandler(id);
            !is.undefined(handler.error) && handler.error(new error.NetronTimeout(`Response timeout ${this.netron.options.responseTimeout}ms exceeded`));
        });

        this._remoteEvents = new Map();
        this._remoteSubscriptions = new Map();
        this._ctxidDefs = new Map();
        this._proxifiedContexts = new Map();

        this._defs = new Map();
        this._ownDefIds = []; // proxied contexts (used when proxifyContexts feature is enabled)

        // subscribe on task result for contextDefs
        this.on("task:result", (task, info) => {
            if (task === "contextDefs" && info.result) {
                this._updateStrongDefinitions(info.result);
            }
        });
    }

    get connected() {
        return !is.null(this._writer);
    }

    get(defId, name, defaultData) {
        const ctxDef = this._defs.get(defId);
        if (is.undefined(ctxDef)) {
            throw new error.NotExistsException(`Context with definition id '${defId}' not exists`);
        }

        let $ = ctxDef.$;
        if (name in $) {
            $ = $[name];
            defaultData = this._processArgs(ctxDef, $, defaultData);
            return new Promise((resolve, reject) => {
                this._sendRequest(ACTION.GET, [defId, name, defaultData], (result) => {
                    resolve(this._processResult(ctxDef, result));
                }, reject).catch(reject);
            });
        }
        throw new error.NotExistsException(`'${name}' not exists`);
    }

    set(defId, name, data) {
        const ctxDef = this._defs.get(defId);
        if (is.undefined(ctxDef)) {
            throw new error.NotExistsException(`Context with definition id '${defId}' not exists`);
        }

        let $ = ctxDef.$;
        if (name in $) {
            $ = $[name];
            if (!$.method && $.readonly) {
                throw new error.InvalidAccessException(`'${name}' is not writable`);
            }
            data = this._processArgs(ctxDef, $, data);
            return new Promise((resolve, reject) => {
                this._sendRequest(ACTION.SET, [defId, name, data], () => {
                    resolve();
                }, reject).catch(reject);
            });
        }
        throw new error.NotExistsException(`'${name}' not exists`);
    }

    async subscribe(eventName, handler) {
        const handlers = this._remoteEvents.get(eventName);
        if (is.undefined(handlers)) {
            this._remoteEvents.set(eventName, [handler]);
            await this.runTask({
                task: "netronSubscribe",
                args: eventName
            });
        } else {
            handlers.push(handler);
        }
    }

    async unsubscribe(eventName, handler) {
        const handlers = this._remoteEvents.get(eventName);
        if (!is.undefined(handlers)) {
            const index = handlers.indexOf(handler);
            if (index >= 0) {
                handlers.splice(index, 1);
                if (handlers.length === 0) {
                    this._remoteEvents.delete(eventName);
                    await this.runTask({
                        task: "netronUnsubscribe",
                        args: eventName
                    });
                }
            }
        }
    }

    async attachContext(instance, ctxId = null) {
        const config = this.getTaskResult("netronGetConfig");
        if (config === adone.null || !config.proxifyContexts) {
            throw new error.NotSupportedException(`Context proxification feature is not enabled on remote netron (peer id: '${this.id}')`);
        }

        const stub = this.netron.stubManager.createStub(instance);
        if (is.null(ctxId)) {
            ctxId = stub.reflection.getName();
        }

        if (this._proxifiedContexts.has(ctxId)) {
            throw new error.ExistsException(`Context '${ctxId}' already proxified on the peer '${this.id}' side`);
        }

        const def = stub.definition;
        this.netron.stubManager.addStub(stub);
        this._proxifiedContexts.set(ctxId, def.id);
        const taskResult = await this.runTask({
            task: "netronProxifyContext",
            args: [ctxId, def]
        });

        return taskResult.netronProxifyContext.result;
    }

    async detachContext(ctxId, releaseOriginated) {
        const config = this.getTaskResult("netronGetConfig");
        if (config !== adone.null && !config.proxifyContexts) {
            throw new error.NotSupportedException(`Context proxification feature is not enabled on remote netron (peer id: '${this.id}')`);
        }
        const defId = this._proxifiedContexts.get(ctxId);
        if (is.undefined(defId)) {
            throw new error.NotExistsException(`Context '${ctxId}' not proxified on the peer '${this.id}' code`);
        }
        this.netron.stubManager.deleteStub(defId);
        this._proxifiedContexts.delete(ctxId);
        const taskResult = await this.runTask({
            task: "netronDeproxifyContext",
            args: [ctxId, releaseOriginated]
        });

        return taskResult.netronDeproxifyContext.result;
    }

    hasContexts() {
        return this._ctxidDefs.size > 0;
    }

    hasContext(ctxId) {
        return this._ctxidDefs.has(ctxId);
    }

    getContextNames() {
        return Array.from(this._ctxidDefs.keys());
    }

    getActiveRequests() {
        return this._responseHandlers.size;
    }

    _write(pkt) {
        return new Promise((resolve, reject) => {
            // if (!is.null(this.connection)) {
            if (!is.null(this._writer)) {
                const rawPkt = packet.encode(pkt).toBuffer();
                HEADER_BUFFER.writeUInt32BE(rawPkt.length, 0);
                // pull-pushable won't using right order while processing data, so we can only push header+packet as one chunk
                this._writer.push(Buffer.concat([HEADER_BUFFER, rawPkt]));
                // this._writer.push(HEADER_BUFFER);
                // this._writer.push(rawPkt);
                resolve();
            } else {
                resolve(); // TODO: is it correct or me be
                // reject(new adone.error.IllegalStateException("No active connection for netron protocol"));
            }
        });
    }

    _sendRequest(action, data, result, error) {
        const id = this._packetUid.create();
        if (is.function(result) || is.function(error)) {
            this._responseHandlers.set(id, {
                result,
                error
            });
        }
        return this._write(packet.create(id, 1, action, data));
    }

    _sendResponse(packet, data) {
        packet.setImpulse(0);
        packet.setData(data);
        return this._write(packet);
    }

    _sendErrorResponse(packet, error) {
        packet.setImpulse(0);
        packet.setError(1);
        packet.setData(error);
        return this._write(packet);
    }

    _handleResponse(packet) {
        const id = packet.id;
        const handler = this._deleteHandler(id);
        const isError = packet.getError();
        const data = packet.data;
        switch (isError) {
            case 0: return !is.undefined(handler.result) && handler.result(data);
            case 1: return !is.undefined(handler.error) && handler.error(data);
        }
    }

    _deleteHandler(id) {
        const handler = this._responseHandlers.get(id);
        this._responseHandlers.delete(id);
        return handler;
    }

    _runTask(task) {
        return new Promise((resolve, reject) => {
            this._sendRequest(ACTION.TASK, task, (result) => {
                if (!is.plainObject(result)) {
                    return reject(new adone.error.NotValidException(`Not valid result: ${adone.typeOf(result)}`));
                }
                resolve(result);
            });
        });
    }

    _queryInterfaceByDefinition(defId) {
        const def = this._defs.get(defId);
        if (is.undefined(def)) {
            throw new error.UnknownException(`Unknown definition '${defId}'`);
        }
        return this.netron.interfaceFactory.create(def, this);
    }

    _getContextDefinition(ctxId) {
        const def = this._ctxidDefs.get(ctxId);
        if (is.undefined(def)) {
            throw new error.NotExistsException(`Context '${ctxId}' not exists`);
        }
        return def;
    }

    /**
     * Updates connection instances
     * 
     */
    async _updateConnectionInfo({ peerId, stream, protocol } = {}) {
        if (!stream) {
            const id = this.id;

            this._writer.end();
            this._writer = null;

            this.netron.deletePeer(this);

            if (this._remoteSubscriptions.size > 0) {
                for (const [eventName, fn] of this._remoteSubscriptions.entries()) {
                    this.removeListener(eventName, fn);
                }
                this._remoteSubscriptions.clear();
            }

            this.netron.stubManager.peerStubs.delete(id);

            // Release stubs sended to peer;
            for (const [defId, stub] of this.netron.stubManager.stubs.entries()) {
                const def = stub.definition;
                if (def.peerId === id) {
                    this.netron.stubManager.deleteStub(defId, true);
                }
            }

            this._deleteAllInterfaces();

            await this.netron.emitSpecial("peer:disconnect", `peer:${id}`, {
                id
            });
            this.netron.deleteSpecialEvents(`peer:${id}`);

            return;
        }

        const id = this.id = peerId;

        this._writer = pull.pushable((err) => {
            if (err) {
                // console.error(adone.pretty.error(err));
            }
        });

        // receive data from remote netron
        const permBuffer = new adone.buffer.SmartBuffer(0);
        let lpsz = 0;

        pull.pipe(
            this._writer,
            stream.sink
        );

        pull.pipe(
            stream.source,
            async (source) => {
                // For each chunk of data
                for await (const bl of source) {
                    const chunk = bl.slice(); // (.slice converts BufferList to Buffer)
                    const buffer = permBuffer;
                    buffer.write(chunk);

                    for (; ;) {
                        if (buffer.length <= 4) {
                            break;
                        }
                        let packetSize = lpsz;
                        if (packetSize === 0) {
                            lpsz = packetSize = buffer.readUInt32BE();
                        }
                        if (buffer.length < packetSize) {
                            break;
                        }

                        try {
                            const roffset = buffer.roffset;
                            const pkt = packet.decode(buffer);
                            if (packetSize !== (buffer.roffset - roffset)) {
                                throw new error.NotValidException("Invalid packet");
                            }
                            this._processPacket(pkt);
                        } catch (err) {
                            buffer.reset(true);
                            // console.error(adone.pretty.error(err));
                        } finally {
                            lpsz = 0;
                        }
                    }
                }
            }
        );

        this.netron.addPeer(this);
        // this.protocol = protocol;
        this.connectedTime = new Date();

        // greet remote...
        await this.runTask(ON_CONNECT_TASKS);
        if (is.object(this.task.netronGetContextDefs.result)) {
            this._updateStrongDefinitions(this.task.netronGetContextDefs.result);
        }

        // Subscribe on context events.
        await Promise.all([
            this.subscribe("context:attach", (peer, { id, def }) => {
                const entry = {};
                entry[id] = def;
                this._updateStrongDefinitions(entry);
            }),
            this.subscribe("context:detach", (peer, { id, defId }) => {
                this._ctxidDefs.delete(id);
                this._defs.delete(defId);
            })
        ]);
        
        this.netron.emitSpecial("peer:connect", `peer:${id}`, {
            id
        });
    }

    async _processPacket(packet) {
        const action = packet.getAction();
        switch (action) {
            case ACTION.SET: {
                if (packet.getImpulse()) {
                    const data = packet.data;
                    const defId = data[0];
                    const name = data[1];

                    try {
                        const stub = this.netron.stubManager.getStub(defId);

                        if (is.undefined(stub)) {
                            return this._sendErrorResponse(packet, new error.NotExistsException(`Context with definition id '${defId}' not exists`));
                        }
                        await this._sendResponse(packet, await stub.set(name, data[2], this));
                    } catch (err) {
                        console.error(adone.pretty.error(err));
                        if (err.name !== "NetronIllegalState") {
                            try {
                                await this._sendErrorResponse(packet, normalizeError(err));
                            } catch (err) {
                                console.error(adone.pretty.error(err));
                            }
                        }
                    }
                } else {
                    this._handleResponse(packet);
                }
                break;
            }
            case ACTION.GET: {
                if (packet.getImpulse()) {
                    const data = packet.data;
                    const defId = data[0];
                    const name = data[1];

                    try {
                        const stub = this.netron.stubManager.getStub(defId);

                        if (is.undefined(stub)) {
                            return this._sendErrorResponse(packet, new error.NotExistsException(`Context with definition id '${defId}' not exists`));
                        }
                        await this._sendResponse(packet, await stub.get(name, data[2], this));
                    } catch (err) {
                        if (err.name !== "NetronIllegalState") {
                            try {
                                await this._sendErrorResponse(packet, normalizeError(err));
                            } catch (err) {
                                console.error(adone.pretty.error(err));
                            }
                        }
                    }
                } else {
                    this._handleResponse(packet);
                }
                break;
            }
            case ACTION.TASK: {
                if (packet.getImpulse()) {
                    this._sendResponse(packet, await this.netron.runTask(this, packet.data));
                } else {
                    this._handleResponse(packet);
                }
                break;
            }
        }
    }

    _updateDefinitions(defs) {
        for (const [, def] of adone.util.entries(defs, { all: true })) {
            // if (this.netron.options.acceptTwins === false) {
            //     delete def.twin;
            // }
            this._defs.set(def.id, def);
        }
    }

    _processResult(ctxDef, result) {
        if (is.netronDefinition(result)) {
            this._updateDefinitions({ weak: result });
            if (ctxDef.$remote) {
                const iCtx = this.netron.interfaceFactory.create(result, this);
                const stub = this.netron.stubManager.createRemoteStub(iCtx);
                const def = stub.definition;
                def.parentId = ctxDef.$proxyDef.id;
                result.$remote = true;
                result.$proxyDef = def;
                this._proxifyContext(result.id, stub);
                return def;
            }
            return this.netron.interfaceFactory.create(result, this);

        } else if (is.netronDefinitions(result)) {
            for (let i = 0; i < result.length; i++) {
                result.set(i, this._processResult(ctxDef, result.get(i)));
            }
        }
        return result;
    }

    _processArgs(ctxDef, field, data) {
        if (ctxDef.$remote) {
            if (field.method) {
                this._processArgsRemote(data, true, ctxDef);
            } else {
                data = this._processArgsRemote(data, false, ctxDef);
            }
        }
        return data;
    }

    _processArgsRemote(args, isMethod, ctxDef) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                args[i] = this._processObjectRemote(args[i], ctxDef);
            }
        } else {
            return this._processObjectRemote(args, ctxDef);
        }
    }

    _processObjectRemote(obj, ctxDef) {
        if (is.netronDefinition(obj)) {
            const iCtx = this.netron.interfaceFactory.create(obj, obj.$peer);
            const stub = this.netron.stubManager.createRemoteStub(iCtx);
            const def = stub.definition;
            obj.$remote = true;
            obj.$proxyDef = def;
            this._proxifyContext(obj.id, stub);
            obj.$peer._updateDefinitions({ "": obj });
            return def;
        } else if (is.netronDefinitions(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj.set(i, this._processObjectRemote(obj.get(i)));
            }
        } else if (is.netronReference(obj)) {
            if (ctxDef.$proxyDef.id === obj.defId) {
                return new Reference(ctxDef.id);
            }
            const def = this.netron.stubManager.getStub(obj.defId).definition;
            if (def.parentId === ctxDef.id) {
                return new Reference(def.id);
            }
            return def;
        }
        return obj;
    }

    _proxifyContext(ctxId, stub) {
        const def = stub.definition;
        this.netron.stubManager.addStub(stub);
        return def.id;
    }

    _updateStrongDefinitions(defs) {
        for (const [ctxId, def] of Object.entries(defs)) {
            def.ctxId = ctxId;
            this._ctxidDefs.set(ctxId, def);
        }
        this._updateDefinitions(defs);
    }
}
