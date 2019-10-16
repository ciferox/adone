const {
    is,
    error
} = adone;

export const NETRON_PROTOCOL = "/netron/1.0.0";

export const ACTION = {
    GET: 0x00,
    SET: 0x01,
    TASK: 0x02

    // MAX: 0x3F
};

const __ = adone.lazifyp({
    I_DEFINITION_SYMBOL: () => Symbol(),
    I_PEERID_SYMBOL: () => Symbol(),
    InterfaceFactory: "./interface_factory"
}, exports, require);


/**
 * Class represented netron interface.
 * 
 * For checking object is netron interface use is.netronInterface() predicate.
 */
export class Interface {
    constructor(def, peerId) {
        this[__.I_DEFINITION_SYMBOL] = def;
        this[__.I_PEERID_SYMBOL] = peerId;
    }
}

export class Definition {
    constructor() {
        this.id = undefined;
        this.name = undefined;
        this.description = undefined;
        this.$ = undefined;
        // this.twin = undefined;
    }
}

export class Reference {
    constructor(defId) {
        this.defId = defId;
    }
}

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
            if (!is.netronDefinition(arg) && !is.netronContext(arg) && !is.netronInterface(arg)) {
                throw new error.InvalidArgumentException(`Invalid argument ${i} (${typeof (arg)})`);
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
            if (!is.netronDefinition(arg) && !is.netronContext(arg) && !is.netronInterface(arg)) {
                throw new error.InvalidArgumentException(`Invalid argument ${i} (${typeof (arg)})`);
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

adone.lazify({
    contextify: () => adone.netron.meta.contextify,
    meta: "./meta",
    StubManager: "./stub_manager",
    Stub: "./stub",
    RemoteStub: "./remote_stub",
    Netron: "./netron",
    AbstractPeer: "./abstract_peer",
    OwnPeer: "./own_peer",
    RemotePeer: "./remote_peer",
    packet: "./packet",
    task: "./tasks",
    uid: "./uids",
    ipc: "./ipc",
    AbstractNetCore: "./abstract_net_core",
    IPCNetCore: "./ipc_net_core",
    P2PNetCore: "./p2p_net_core"
}, adone.asNamespace(exports), require);


// Temporary API
export const createPeerId = ({ bits } = {}) => {
    return new Promise((resolve, reject) => {
        adone.p2p.PeerId.create({ bits }, (err, peerId) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(peerId);
        });
    });
};

export const createPeerInfo = async ({ peerId, addr, bits } = {}) => {
    if (!is.peerId(peerId)) {
        peerId = await createPeerId({ bits });
    }

    return new Promise((resolve, reject) => {
        adone.p2p.PeerInfo.create(peerId, (err, peerInfo) => {
            if (err) {
                return reject(err);
            }
            adone.util.arrify(addr).map((ma) => peerInfo.multiaddrs.add(ma));
            resolve(peerInfo);
        });
    });
};
