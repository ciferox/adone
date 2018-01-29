const {
    is,
    meta: { reflect },
    x,
    tag
} = adone;

export const NETRON_PROTOCOL = "/netron/1.0.0";

export const ACTION = {
    // Contexts
    REQUEST_CONTEXTS: 0x00,
    CONTEXT_ATTACH: 0x01,
    CONTEXT_DETACH: 0x02,

    // Events
    EVENT_ON: 0x10,
    EVENT_OFF: 0x11,
    EVENT_EMIT: 0x12,

    // Functional actions
    GET: 0x20,
    SET: 0x21,
    PING: 0x22,

    MAX: 0x100 // = 256
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
        this.twin = undefined;
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
                throw new x.InvalidArgument(`Invalid argument ${i} (${typeof (arg)})`);
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
                throw new x.InvalidArgument(`Invalid argument ${i} (${typeof (arg)})`);
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

adone.lazify({
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
    RemotePeer: "./remote_peer"
}, adone.asNamespace(exports), require);
