const {
    is,
    util,
    netron: { Reference, Definitions },
    tag
} = adone;

const __ = adone.private(adone.netron);

/**
 * Class represented netron interface.
 * 
 * For checking object is netron interface use is.netronInterface() predicate.
 */
class Interface {
    constructor(def, peerId) {
        this[__.I_DEFINITION_SYMBOL] = def;
        this[__.I_PEERID_SYMBOL] = peerId;
    }
}
tag.add(Interface, "NETRON_INTERFACE");

export default class InterfaceFactory {
    constructor(netron) {
        this.netron = netron;
    }

    create(def, peer) {
        const defId = def.id;
        const base58Str = peer.info.id.asBase58();
        let iInstance = peer.interfaces.get(defId);
        if (!is.undefined(iInstance)) {
            return iInstance;
        }

        // Заготовка под создаваемый интерфейс.
        class XInterface extends Interface { }

        const proto = XInterface.prototype;

        for (const [key, meta] of util.entries(def.$, { all: true })) {
            if (meta.method) {
                const method = (...args) => {
                    this._processArgs(peer.info, args, true);
                    return peer.get(defId, key, args);
                };
                method.void = (...args) => {
                    this._processArgs(peer.info, args, true);
                    return peer.set(defId, key, args);
                };
                proto[key] = method;
            } else {
                const propMethods = {};
                propMethods.get = (defaultValue) => {
                    defaultValue = this._processArgs(peer.info, defaultValue, false);
                    return peer.get(defId, key, defaultValue);
                };
                if (!meta.readonly) {
                    propMethods.set = (value) => {
                        value = this._processArgs(peer.info, value, false);
                        return peer.set(defId, key, value);
                    };
                }
                proto[key] = propMethods;
            }
        }

        iInstance = new XInterface(def, base58Str);

        // if (!is.undefined(def.twin)) {
        //     let twinCode;
        //     if (!is.string(def.twin) && is.string(def.twin.node)) {
        //         twinCode = def.twin.node;
        //     } else {
        //         twinCode = def.twin;
        //     }

        //     if (is.string(twinCode)) {
        //         const wrappedCode = `
        //             (function() {
        //                 return ${twinCode};
        //             })();`;

        //         const taskClassScript = adone.std.vm.createScript(adone.js.compiler.core.transform(wrappedCode, this.options.transpiler).code, { filename: def.name, displayErrors: true });
        //         const scriptOptions = {
        //             displayErrors: true,
        //             breakOnSigint: false
        //         };

        //         const TwinInterface = taskClassScript.runInThisContext(scriptOptions);
        //         if (is.netronInterface(new TwinInterface())) {
        //             class XTwin extends TwinInterface { }
        //             const twinProto = XTwin.prototype;
        //             const twinMethods = util.keys(twinProto, { all: true });
        //             for (const [name, prop] of util.entries(XInterface.prototype, { all: true })) {
        //                 if (!twinMethods.includes(name)) {
        //                     twinProto[name] = prop;
        //                 }
        //             }

        //             const twinInterface = new XTwin();
        //             twinInterface.$twin = anInterface;
        //             this.interfaces.set(hash, twinInterface);
        //             return twinInterface;
        //         }
        //     }
        // } else if (this._localTwins.has(def.name)) {
        //     const TwinInterface = this._localTwins.get(def.name);
        //     if (!is.undefined(TwinInterface)) {
        //         class XTwin extends TwinInterface { }
        //         const twinProto = XTwin.prototype;
        //         const twinMethods = util.keys(twinProto, { all: true });
        //         for (const [name, prop] of util.entries(XInterface.prototype, { all: true })) {
        //             if (!twinMethods.includes(name)) {
        //                 twinProto[name] = prop;
        //             }
        //         }

        //         const twinInterface = new XTwin();
        //         twinInterface.$twin = anInterface;
        //         this.interfaces.set(hash, twinInterface);
        //         return twinInterface;
        //     }
        // }

        peer.interfaces.set(defId, iInstance);
        return iInstance;
    }

    _processObject(peerInfo, obj) {
        if (is.netronInterface(obj)) {
            return new Reference(obj[__.I_DEFINITION_SYMBOL].id);
        } else if (is.netronContext(obj)) {
            const def = this.netron.refContext(peerInfo, obj);
            def.peerId = peerInfo.id.asBase58(); // definition owner
            return def;
        } else if (is.netronDefinitions(obj)) {
            const newDefs = new Definitions();
            for (let i = 0; i < obj.length; i++) {
                newDefs.push(this._processObject(peerInfo, obj.get(i)));
            }
            return newDefs;
        }
        return obj;
    }

    _processArgs(peerInfo, args, isMethod) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                args[i] = this._processObject(peerInfo, args[i]);
            }
        } else {
            return this._processObject(peerInfo, args);
        }
    }
}
