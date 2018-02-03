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

        this.netCore = netCore;
        this.rawConn = null;
        this.netronConn = null;
        this.protocol = adone.netron2.NETRON_PROTOCOL;

        this.packetId = new FastUniqueId();
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
    }

    /**
     * Disconnects peer.
     */
    disconnect() {
        return this.netron.disconnectPeer(this);
    }

    isConnected() {
        return !is.null(this.rawConn);
    }

    isNetronConnected() {
        return !is.null(this.netronConn);
    }

    write(pkt) {
        return new Promise((resolve, reject) => {
            if (!is.null(this.netronConn)) {
                const rawPkt = packet.encode(pkt).toBuffer();
                HEADER_BUFFER.writeUInt32BE(rawPkt.length, 0);
                pull(
                    pull.values([HEADER_BUFFER, rawPkt]),
                    this.netronConn
                );
                resolve();
            } else {
                reject(new adone.exception.IllegalState("No active connection for netron protocol"));
            }
        });
    }

    send(impulse, packetId, action, data, awaiter) {
        is.function(awaiter) && this._setAwaiter(packetId, awaiter);
        return this.write(packet.create(packetId, impulse, action, data));
    }

    sendReply(packet) {
        packet.setImpulse(0);
        return this.write(packet);
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
                this.send(1, this.packetId.get(), ACTION.GET, [defId, name, defaultData], (result) => {
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
            return this.send(1, this.packetId.get(), ACTION.SET, [defId, name, data]);
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

    _runTask(task) {
        return new Promise((resolve, reject) => {
            this.send(1, this.packetId.get(), ACTION.TASK, task, (result) => {
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
        return this.netron._createInterface(def, this);
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
     * @param {Connection|null|undefined} rawConn - instance of raw connection 
     * @param {Connection|null|undefined} netronConn - instance of netron connection
     */
    _setConnInfo(rawConn, netronConn) {
        if (!is.undefined(rawConn)) {
            this.rawConn = rawConn;
        }

        if (!is.undefined(netronConn)) {
            this.netronConn = netronConn;
            if (is.null(netronConn)) {
                return;
            }

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
                netronConn,
                pull.drain(handler)
            );
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


    _setAwaiter(id, awaiter) {
        this._responseAwaiters.set(id, awaiter);
    }

    _deleteAwaiter(id) {
        const awaiter = this._responseAwaiters.get(id);
        this._responseAwaiters.delete(id);
        return awaiter;
    }
}
adone.tag.add(RemotePeer, "NETRON2_REMOTEPEER");
