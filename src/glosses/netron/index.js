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

adone.lazify({
    decorator: "./decorators",
    Investigator: "./investigator",
    SequenceId: "./sequence_id",
    GenesisNetron: "./genesis_netron",
    GenesisPeer: "./genesis_peer",
    Netron: "./netron",
    Peer: "./peer",
    Stub: "./stub",
    Identity: "./identity",
    RemoteStub: "./remote_stub",
    Definition: "./definition",
    Definitions: "./definitions",
    Reference: "./reference",
    Interface: "./interface",
    Adapter: "./adapter",
    Stream: "./stream",
    contextable: () => {
        const contextables = {};
        const mod = require("./contextables");

        for (const [className, Cls] of Object.entries(mod)) {
            contextables[className.replace("Contextable", "")] = Cls;
        }

        return contextables;
    }
}, exports, require);
