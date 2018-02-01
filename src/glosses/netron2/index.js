const {
    is,
    meta: { reflect },
    exception,
    tag
} = adone;

export const NETRON_PROTOCOL = "/netron/1.0.0";

export const ACTION = {
    // Common actions
    GET: 0x00,
    SET: 0x01,
    META: 0x02,

    // Events
    EVENT_ON: 0x10,
    EVENT_OFF: 0x11,
    EVENT_EMIT: 0x12,

    // Contexts
    CONTEXT_ATTACH: 0x20,
    CONTEXT_DETACH: 0x21

    // MAX: 0x7F
};

adone.definePredicates({
    netron2: "NETRON2",
    netron2Definition: "NETRON2_DEFINITION",
    netron2Definitions: "NETRON2_DEFINITIONS",
    netron2Reference: "NETRON2_REFERENCE",
    netron2Interface: "NETRON2_INTERFACE",
    netron2Stub: "NETRON2_STUB",
    netron2Peer: "NETRON2_ABSTRACTPEER",
    netron2OwnPeer: "NETRON2_OWNPEER",
    netron2RemotePeer: "NETRON2_REMOTEPEER"
});

adone.defineCustomPredicate("netron2Context", (obj) => {
    let isContex = false;
    let target = undefined;

    if (is.class(obj)) {
        target = obj;
    } else if (is.propertyDefined(obj, "__proto__") && is.propertyOwned(obj.__proto__, "constructor")) {
        target = obj.__proto__.constructor;
    }
    if (!is.undefined(target)) {
        isContex = is.object(reflect.getMetadata(adone.netron2.CONTEXT_ANNOTATION, target));
    }
    return isContex;
});

adone.defineCustomPredicate("netron2IMethod", (ni, name) => (is.function(ni[name]) && (ni.$def.$[name].method === true)));
adone.defineCustomPredicate("netron2IProperty", (ni, name) => (is.object(ni[name]) && is.function(ni[name].get) && (is.undefined(ni.$def.$[name].method))));


export class Definition {
    constructor() {
        this.id = undefined;
        this.name = undefined;
        this.description = undefined;
        this.$ = undefined;
        // this.twin = undefined;
    }
}
tag.add(Definition, "NETRON2_DEFINITION");

export class Reference {
    constructor(defId) {
        this.defId = defId;
    }
}
tag.add(Reference, "NETRON2_REFERENCE");

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
                throw new exception.InvalidArgument(`Invalid argument ${i} (${typeof (arg)})`);
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
                throw new exception.InvalidArgument(`Invalid argument ${i} (${typeof (arg)})`);
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
adone.tag.add(Definitions, "NETRON2_DEFINITIONS");

const MAX_INTEGER = Number.MAX_SAFE_INTEGER >>> 0;

export class FastUniqueId {
    constructor() {
        this.id = 0 >>> 0;
    }

    get() {
        if (this.id === MAX_INTEGER) {
            this.id = 1;
        } else {
            this.id++;
        }
        return this.id;
    }

    isEqual(id1, id2) {
        return id1 === id2;
    }
}

adone.lazify({
    UniqueId: () => {
        const { math: { Long } } = adone;
        const ONE_LONG = new Long(1, 0, true);
        const ZERO = 0 >>> 0;
        const ONE = 1 >>> 0;
        class UniqueId {
            constructor() {
                this.id = new Long(0, 0, true);
            }

            get() {
                if (this.id.equals(Long.MAX_UNSIGNED_VALUE)) {
                    this.id.low = ONE;
                    this.id.high = ZERO;
                } else {
                    this.id = this.id.add(ONE_LONG);
                }
                return this.id;
            }

            isEqual(id1, id2) {
                return id1.equals(id2);
            }
        }

        return UniqueId;
    },
    Reflection: ["./reflection", (mod) => mod.Reflection],
    DContext: ["./reflection", (mod) => mod.DContext], // decorator
    DPublic: ["./reflection", (mod) => mod.DPublic], // decorator
    DMethod: ["./reflection", (mod) => mod.DMethod], // decorator
    DProperty: ["./reflection", (mod) => mod.DProperty], // decorator
    CONTEXT_ANNOTATION: ["./reflection", (mod) => mod.CONTEXT_ANNOTATION],
    Stub: "./stub",
    Netron: "./netron",
    AbstractPeer: "./abstract_peer",
    OwnPeer: "./own_peer",
    RemotePeer: "./remote_peer",
    packet: "./packet",
    metaHandler: "./meta_handlers"
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    I_DEFINITION_SYMBOL: () => Symbol(),
    I_PEERID_SYMBOL: () => Symbol()
}, exports, require);
