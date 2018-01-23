const {
    is,
    netron2: { ACTION, AbstractPeer, Packet },
    x
} = adone;

export default class RemotePeer extends AbstractPeer {
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
    
    send(impulse, streamId, packetId, action, data, awaiter) {
        const status = this.getStatus();
        if (is.function(awaiter)) {
            this._setAwaiter(streamId, awaiter);
        }

        return this.write(Packet.create(packetId, streamId, impulse, action, status, data).raw);
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
                this.send(this, 1, this.streamId.next(), 1, ACTION.GET, [defId, name, defaultData], (result) => {
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
            return this.send(this, 1, this.streamId.next(), 1, ACTION.SET, [defId, name, data]);
        }
        return Promise.reject(new x.NotExists(`'${name}' not exists`));
    }

    ping() {
        return new Promise((resolve, reject) => {
            this.send(this, 1, this.streamId.next(), 1, ACTION.PING, null, resolve).catch(reject);
        });
    }

    hasContext(ctxId) {
        return this._ctxidDefs.has(ctxId);
    }

    getInterfaceById(defId) {
        const def = this._defs.get(defId);
        if (is.undefined(def)) {
            throw new x.Unknown(`Unknown definition '${defId}'`);
        }
        return this.netron._createInterface(def, this.info);
    }

    getDefinitionByName(ctxId) {
        return this._ctxidDefs.get(ctxId);
    }
}
adone.tag.add(RemotePeer, "NETRON2_REMOTETPEER");