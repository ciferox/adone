const {
    is,
    collection: { TimedoutMap },
    netron2: { ACTION, AbstractPeer, packet, FastUniqueId },
    stream: { pull },
    exception
} = adone;

const HEADER_BUFFER = Buffer.alloc(4);

export default class RemotePeer extends AbstractPeer {
    constructor(info, netron, netCore) {
        super(info, netron);

        this._writer = undefined;
        this.netCore = netCore;
        this._conn = null;
        this.protocol = adone.netron2.NETRON_PROTOCOL;

        this._packetIdPool = new FastUniqueId();
        this._responseAwaiters = new TimedoutMap(this.netron.options.responseTimeout, (id) => {
            const awaiter = this._deleteAwaiter(id);
            awaiter([1, new exception.NetronTimeout(`Response timeout ${this.netron.options.responseTimeout}ms exceeded`)]);
        });

        this._remoteEvents = new Map();
        this._remoteSubscriptions = new Map();
        this._ctxidDefs = new Map();
        this._proxifiedContexts = new Map();

        this._defs = new Map();
        this._ownDefIds = []; // proxied contexts (used when proxyContexts feature is enabled)

        // subscribe on task result for contextDefs
        this.on("task:result", (task, info) => {
            if (task === "contextDefs" && info.result) {
                this._updateStrongDefinitions(info.result);
            }
        });
    }

    /**
     * Disconnects peer.
     */
    disconnect() {
        return this.netron.disconnectPeer(this);
    }

    isConnected() {
        return !is.null(this._conn);
    }

    get(defId, name, defaultData) {
        const ctxDef = this._defs.get(defId);
        if (is.undefined(ctxDef)) {
            return Promise.reject(new exception.Unknown(`Unknown definition '${defId}'`));
        }

        let $ = ctxDef.$;
        if (name in $) {
            $ = $[name];
            defaultData = this._processArgs(ctxDef, $, defaultData);
            return new Promise((resolve, reject) => {
                this._send(1, ACTION.GET, [defId, name, defaultData], (result) => {
                    if (result[0] === 1) {
                        reject(result[1]);
                    } else {
                        resolve(this._processResult(ctxDef, result[1]));
                    }
                }).catch(reject);
            });
        }
        return Promise.reject(new exception.NotExists(`'${name}' not exists`));
    }

    set(defId, name, data) {
        const ctxDef = this._defs.get(defId);
        if (is.undefined(ctxDef)) {
            return Promise.reject(new exception.Unknown(`Unknown definition '${defId}'`));
        }

        let $ = ctxDef.$;
        if (name in $) {
            $ = $[name];
            if (!$.method && $.readonly) {
                return Promise.reject(new exception.InvalidAccess(`'${name}' is not writable`));
            }
            data = this._processArgs(ctxDef, $, data);
            return this._send(1, ACTION.SET, [defId, name, data]);
        }
        return Promise.reject(new exception.NotExists(`'${name}' not exists`));
    }

    async subscribe(eventName, handler) {
        const handlers = this._remoteEvents.get(eventName);
        if (is.undefined(handlers)) {
            this._remoteEvents.set(eventName, [handler]);
            await this.runTask({
                task: "subscribe",
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
                        task: "unsubscribe",
                        args: eventName
                    });
                }
            }
        }
    }

    async attachContext(instance, ctxId = null) {
        const config = this.getTaskResult("config");
        if (config !== adone.null && !config.proxyContexts) {
            throw new exception.NotSupported(`Context proxification feature is not enabled on remote netron (peer id: '${this.info.id.asBase58()}')`);
        }

        const stub = new adone.netron2.Stub(this.netron, instance);
        if (is.null(ctxId)) {
            ctxId = stub.reflection.getName();
        }

        if (this._proxifiedContexts.has(ctxId)) {
            throw new exception.Exists(`Context '${ctxId}' already proxified on the peer '${this.info.id.asBase58()}' side`);
        }

        const def = stub.definition;
        this.netron._stubs.set(def.id, stub);
        this._proxifiedContexts.set(ctxId, def.id);
        return this.runTask({
            task: "proxifyContext",
            args: [ctxId, def]
        });
    }

    async detachContext(ctxId, releaseOriginated) {
        const config = this.getTaskResult("config");
        if (config !== adone.null && !config.proxyContexts) {
            throw new exception.NotSupported(`Context proxification feature is not enabled on remote netron (peer id: '${this.info.id.asBase58()}')`);
        }
        const defId = this._attachedContexts.get(ctxId);
        if (is.undefined(defId)) {
            throw new exception.NotExists(`Context '${ctxId}' not proxified on the peer '${this.info.id.asBase58()}' code`);
        }
        this.netron._stubs.delete(defId);
        this._attachedContexts.delete(ctxId);
        return this.runTask({
            task: "deproxifyContext",
            args: [ctxId, releaseOriginated]
        });
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

    getNumberOfAwaiters() {
        return this._responseAwaiters.size;
    }

    _write(pkt) {
        return new Promise((resolve, reject) => {
            if (!is.null(this._conn)) {
                const rawPkt = packet.encode(pkt).toBuffer();
                HEADER_BUFFER.writeUInt32BE(rawPkt.length, 0);
                // pull-pushable won't using right order while processing data, so we can only push header+packet as one chunk
                this._writer.push(Buffer.concat([HEADER_BUFFER, rawPkt]));
                resolve();
            } else {
                reject(new adone.exception.IllegalState("No active connection for netron protocol"));
            }
        });
    }

    _send(impulse, action, data, awaiter) {
        const packetId = this._packetIdPool.get();
        is.function(awaiter) && this._setAwaiter(packetId, awaiter);
        return this._write(packet.create(packetId, impulse, action, data));
    }

    _sendReply(packet) {
        packet.setImpulse(0);
        return this._write(packet);
    }

    _runTask(task) {
        return new Promise((resolve, reject) => {
            this._send(1, ACTION.TASK, task, (result) => {
                if (!is.plainObject(result)) {
                    return reject(new adone.exception.NotValid(`Not valid result: ${adone.meta.typeOf(result)}`));
                }
                resolve(result);
            });
        });
    }

    _queryInterfaceByDefinition(defId) {
        const def = this._defs.get(defId);
        if (is.undefined(def)) {
            throw new exception.Unknown(`Unknown definition '${defId}'`);
        }
        return this.netron.interfaceFactory.create(def, this);
    }

    _getContextDefinition(ctxId) {
        const def = this._ctxidDefs.get(ctxId);
        if (is.undefined(def)) {
            throw new exception.Unknown(`Unknown context '${ctxId}'`);
        }
        return def;
    }

    /**
     * Updates connection instances
     * 
     * @param {Connection|null} conn - instance of connection 
     */
    _setConnInfo(conn) {
        this._conn = conn;
        if (is.null(conn)) {
            this._writer.end();
            this._writer = null;
            return;
        }

        this._writer = pull.pushable();

        // receive data from remote netron
        const permBuffer = new adone.collection.ByteArray(0);
        let lpsz = 0;

        const handler = (chunk) => {
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
                        throw new exception.NotValid("Invalid packet");
                    }
                    this.netron._processPacket(this, pkt);
                } catch (err) {
                    buffer.reset(true);
                    adone.error(err);
                } finally {
                    lpsz = 0;
                }
            }
        };

        pull(
            this._writer,
            conn,
            pull.drain(handler, (err) => {
                // adone.warn(err);
            })
        );
    }

    _updateDefinitions(defs) {
        for (const [, def] of adone.util.entries(defs, { all: true })) {
            // if (this.netron.options.acceptTwins === false) {
            //     delete def.twin;
            // }
            this._defs.set(def.id, def);
        }
    }


    _setAwaiter(id, awaiter) {
        this._responseAwaiters.set(id, awaiter);
    }

    _deleteAwaiter(id) {
        const awaiter = this._responseAwaiters.get(id);
        this._responseAwaiters.delete(id);
        return awaiter;
    }

    _processResult(ctxDef, result) {
        if (is.netronDefinition(result)) {
            this._updateDefinitions({ weak: result });
            if (ctxDef.$remote) {
                const iCtx = this.netron.interfaceFactory.create(result, this.uid);
                const stub = new adone.netron2.RemoteStub(this.netron, iCtx);
                const def = stub.definition;
                def.parentId = ctxDef.$proxyDef.id;
                result.$remote = true;
                result.$proxyDef = def;
                this._proxifyContext(result.id, stub);
                return def;
            }
            return this.netron.interfaceFactory.create(result, this.uid);

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
            const iCtx = this.netron.interfaceFactory.create(obj, obj.$peer.uid);
            const stub = new adone.netron2.RemoteStub(this.netron, iCtx);
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
        }
        return obj;
    }

    _proxifyContext(ctxId, stub) {
        const def = stub.definition;
        const defId = def.id;
        this.netron._stubs.set(defId, stub);
        return defId;
    }

    _updateStrongDefinitions(defs) {
        for (const [ctxId, def] of Object.entries(defs)) {
            def.ctxId = ctxId;
            this._ctxidDefs.set(ctxId, def);
        }
        this._updateDefinitions(defs);
    }

    _subscribeOnContexts() {
        return Promise.all([
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
    }
}
adone.tag.add(RemotePeer, "NETRON2_REMOTEPEER");
