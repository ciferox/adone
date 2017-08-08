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

export const PEER_TYPE = {
    PASSIVE: 0,
    ACTIVE: 1
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
adone.tag.set(Definition, adone.tag.NETRON_DEFINITION);

export class Reference {
    constructor(defId) {
        this.defId = defId;
    }
}
adone.tag.set(Reference, adone.tag.NETRON_REFERENCE);

export class Interface {
    constructor(def, uid) {
        this.$def = def;
        this.$uid = uid;
    }
}
adone.tag.set(Interface, adone.tag.NETRON_INTERFACE);

adone.lazify({
    decorator: "./decorators",
    Investigator: "./investigator",
    GenesisNetron: "./genesis_netron",
    GenesisPeer: "./genesis_peer",
    Netron: "./netron",
    Peer: "./peer",
    Stub: "./stub",
    RemoteStub: "./remote_stub",
    Definitions: "./definitions",
    Adapter: "./adapter",
    Stream: "./stream",
    ws: () => adone.lazify({
        Adapter: "./ws/adapter",
        Netron: "./ws/netron",
        Peer: "./ws/peer"
    }, null, require)
}, exports, require);
