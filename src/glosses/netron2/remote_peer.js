const {
    is,
    collection: { TimedoutMap },
    netron2: { ACTION, AbstractPeer, Packet, FastUniqueId, serializer },
    stream: { pull },
    x
} = adone;

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
            awaiter([1, new x.NetronTimeout(`Response timeout ${this.netron.options.responseTimeout}ms exceeded`)]);
        });

        this._ctxidDefs = new Map();
    }

    isConnected() {
        return !is.null(this.rawConn);
    }

    isNetronConnected() {
        return !is.null(this.netronConn);
    }

    write(data) {
        return new Promise((resolve, reject) => {
            if (!is.null(this.netronConn)) {
                const buf = new adone.collection.ByteArray().skipWrite(4);
                const encoded = serializer.encode(data, buf);
                encoded.writeUInt32BE(encoded.length - 4, 0);
                pull(
                    pull.values([encoded.toBuffer()]),
                    this.netronConn
                );
                resolve();
            } else {
                reject(new adone.x.IllegalState("No active connection for netron protocol"));
            }
        });
    }

    send(impulse, packetId, action, data, awaiter) {
        is.function(awaiter) && this._setAwaiter(packetId, awaiter);
        return this.write(Packet.create(packetId, impulse, action, data).raw);
    }

    sendReply(packet) {
        packet.setImpulse(0);
        return this.write(packet.raw);
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
                this.send(1, this.packetId.next(), ACTION.GET, [defId, name, defaultData], (result) => {
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
            return this.send(1, this.packetId.next(), ACTION.SET, [defId, name, data]);
        }
        return Promise.reject(new x.NotExists(`'${name}' not exists`));
    }

    requestMeta(request) {
        return new Promise(async (resolve, reject) => {
            if (!(is.string(request) || is.array(request) || is.plainObject(request))) {
                return reject(new adone.x.NotValid("Invalid meta request (should be string, plain object or array"));
            }
            this.send(1, this.packetId.next(), ACTION.META, request, async (response) => {
                if (!is.array(response)) {
                    return reject(new adone.x.NotValid(`Not valid response: ${adone.util.typeOf(response)}`));
                }

                for (const res of response) {
                    this.meta.set(res.id, adone.util.omit(res, "id"));
                }
                resolve(response);
            });
        });
    }

    requestAbility() {
        return this.requestMeta("ability");
    }

    requestContexts() {
        return this.requestMeta("contexts");
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

    getInterfaceById(defId) {
        const def = this._defs.get(defId);
        if (is.undefined(def)) {
            throw new x.Unknown(`Unknown definition '${defId}'`);
        }
        return this.netron._createInterface(def, this);
    }

    getDefinitionByName(ctxId) {
        const def = this._ctxidDefs.get(ctxId);
        if (is.undefined(def)) {
            throw new x.Unknown(`Unknown context '${ctxId}'`);
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
            const internalBuffer = new adone.collection.ByteArray(0);
            let lpsz = null;

            const handler = (chunk) => {
                const buffer = internalBuffer;
                buffer.write(chunk);

                for (; ;) {
                    if (buffer.length <= 4) {
                        break;
                    }
                    let packetSize = lpsz;
                    if (is.null(packetSize)) {
                        lpsz = packetSize = buffer.readUInt32BE();
                    }
                    if (buffer.length < packetSize) {
                        break;
                    }

                    const result = serializer.decoder.tryDecode(buffer);
                    if (result) {
                        if (packetSize !== result.bytesConsumed) {
                            buffer.clear();
                            adone.error("invalid packet");
                            break;
                        }
                        this.netron._processPacket(this, result.value);
                        lpsz = null;
                    }
                }
            };

            pull(
                netronConn,
                pull.drain(handler)
            );
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
