const {
    is,
    x,
    data: { mpak: { serializer } },
    lazify,
    tag
} = adone;

adone.definePredicates({
    genesisNetron: "GENESIS_NETRON",
    genesisPeer: "GENESIS_PEER",
    netron: "NETRON",
    netronPeer: "NETRON_PEER",
    netronAdapter: "NETRON_ADAPTER",
    netronDefinition: "NETRON_DEFINITION",
    netronDefinitions: "NETRON_DEFINITIONS",
    netronReference: "NETRON_REFERENCE",
    netronInterface: "NETRON_INTERFACE",
    netronStub: "NETRON_STUB",
    netronRemoteStub: "NETRON_REMOTESTUB",
    netronStream: "NETRON_STREAM"
});

export const DEFAULT_PORT = 8888;

export const ACTION = {
    // Common actions
    GET: 0x00,
    SET: 0x01,
    PING: 0x02,

    // Events
    EVENT_ON: 0x03,
    EVENT_OFF: 0x04,
    EVENT_EMIT: 0x05,

    // Contexts
    CONTEXT_ATTACH: 0x06,
    CONTEXT_DETACH: 0x07,

    // Streams
    STREAM_REQUEST: 0x08,
    STREAM_ACCEPT: 0x09,
    STREAM_DATA: 0x0A,
    STREAM_PAUSE: 0x0B,
    STREAM_RESUME: 0x0C,
    STREAM_END: 0x0D,

    MAX: 0x100 // = 256
};

export const STATUS = {
    // Common statuses
    OFFLINE: 0,
    CONNECTING: 1,
    HANDSHAKING: 2,
    ONLINE: 3,

    MAX: 0x100
};

const MAX_INTEGER = Number.MAX_SAFE_INTEGER >>> 0;

export class SequenceId {
    constructor() {
        this._id = 0 >>> 0;
    }

    next() {
        if (this._id === MAX_INTEGER) {
            this._id = 1;
        } else {
            this._id++;
        }
        return this._id;
    }
}

export class Definition {
    constructor() {
        this.id = undefined;
        this.name = undefined;
        this.description = undefined;
        this.$ = undefined;
        this.twin = undefined;
    }
}
tag.add(Definition, "NETRON_DEFINITION");

export class Reference {
    constructor(defId) {
        this.defId = defId;
    }
}
tag.add(Reference, "NETRON_REFERENCE");

export class Interface {
    constructor(def, uid) {
        this.$def = def;
        this.$uid = uid;
    }
}
tag.add(Interface, "NETRON_INTERFACE");

export class Definitions {
    constructor(...args) {
        this._defs = [...args];
    }

    get length() {
        return this._defs.length;
    }

    get(index) {
        return this._defs[index];
    }

    set(index, val) {
        this._defs[index] = val;
    }

    indexOf(def) {
        return this._defs.indexOf(def);
    }

    find(callback, thisArg) {
        return this._defs.find(callback, thisArg);
    }

    push(...args) {
        let ret;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (!is.netronDefinition(arg) && !adone.netron.Investigator.isContextable(arg) && !is.netronInterface(arg)) {
                throw new x.InvalidArgument(`Invalid argument ${i} (${typeof(arg)})`);
            }
            ret = this._defs.push(arg);
        }
        return ret;
    }

    pop() {
        return this._defs.pop();
    }

    shift() {
        return this._defs.shift();
    }

    unshift(...args) {
        let ret;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (!is.netronDefinition(arg) && !adone.netron.Investigator.isContextable(arg) && !is.netronInterface(arg)) {
                throw new x.InvalidArgument(`Invalid argument ${i} (${typeof(arg)})`);
            }
            ret = this._defs.unshift(arg);
        }
        return ret;
    }

    slice(begin, end) {
        return this._defs.slice(begin, end);
    }

    splice(begin, end, ...items) {
        return this._defs.splice(begin, end, ...items);
    }
}
adone.tag.add(Definitions, "NETRON_DEFINITIONS");

// Netron specific encoders/decoders
serializer.register(109, Definition, (obj, buf) => {
    buf.writeUInt32BE(obj.id);
    buf.writeUInt32BE(obj.parentId);
    serializer.encode(obj.name, buf);
    serializer.encode(obj.description, buf);
    serializer.encode(obj.$, buf);
    serializer.encode(obj.twin, buf);
}, (buf) => {
    const def = new Definition();
    def.id = buf.readUInt32BE();
    def.parentId = buf.readUInt32BE();
    def.name = serializer.decode(buf);
    def.description = serializer.decode(buf);
    def.$ = serializer.decode(buf);
    def.twin = serializer.decode(buf);
    return def;
}).register(108, Reference, (obj, buf) => {
    buf.writeUInt32BE(obj.defId);
}, (buf) => {
    const ref = new Reference();
    ref.defId = buf.readUInt32BE();
    return ref;
}).register(107, Definitions, (obj, buf) => {
    const len = obj.length;
    buf.writeUInt32BE(len);
    for (let i = 0; i < obj.length; i++) {
        const def = obj.get(i);
        serializer.encode(def, buf);
    }
}, (buf) => {
    const defs = new Definitions();
    const len = buf.readUInt32BE();
    for (let i = 0; i < len; i++) {
        const def = serializer.decode(buf);
        defs.push(def);
    }
    return defs;
});

lazify({
    decorator: "./decorators",
    Investigator: "./investigator",
    GenesisNetron: "./genesis_netron",
    GenesisPeer: "./genesis_peer",
    Packet: "./packet",
    Netron: "./netron",
    Peer: "./peer",
    Stub: "./stub",
    RemoteStub: "./remote_stub",
    Adapter: "./adapter",
    Stream: "./stream",
    ws: "./ws"
}, adone.asNamespace(exports), require);
