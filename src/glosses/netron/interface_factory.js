const {
    is,
    util,
    netron: { Reference, Definitions, Interface }
} = adone;

const __ = adone.getPrivate(adone.netron);

export default class InterfaceFactory {
    constructor(netron) {
        this.netron = netron;
    }

    create(def, peer) {
        const defId = def.id;
        let iInstance = peer._getInterface(defId);
        if (!is.undefined(iInstance)) {
            return iInstance;
        }

        const peerId = peer.id;

        class XInterface extends Interface { }

        const proto = XInterface.prototype;

        for (const [key, meta] of util.entries(def.$, { all: true })) {
            if (meta.method) {
                const method = (...args) => {
                    this._processArgs(peerId, args, true);
                    return peer.get(defId, key, args);
                };
                method.void = (...args) => {
                    this._processArgs(peerId, args, true);
                    return peer.set(defId, key, args);
                };
                proto[key] = method;
            } else {
                const propMethods = {};
                propMethods.get = (defaultValue) => {
                    defaultValue = this._processArgs(peerId, defaultValue, false);
                    return peer.get(defId, key, defaultValue);
                };
                if (!meta.readonly) {
                    propMethods.set = (value) => {
                        value = this._processArgs(peerId, value, false);
                        return peer.set(defId, key, value);
                    };
                }
                proto[key] = propMethods;
            }
        }

        iInstance = new XInterface(def, peerId);

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

        peer._addInterface(defId, iInstance);
        return iInstance;
    }

    _processObject(peerId, obj) {
        if (is.netronInterface(obj)) {
            return new Reference(obj[__.I_DEFINITION_SYMBOL].id);
        } else if (is.netronContext(obj)) {
            const def = this.netron.refContext(peerId, obj);
            def.peerId = peerId; // definition owner
            return def;
        } else if (is.netronDefinitions(obj)) {
            const newDefs = new Definitions();
            for (let i = 0; i < obj.length; i++) {
                newDefs.push(this._processObject(peerId, obj.get(i)));
            }
            return newDefs;
        }
        return obj;
    }

    _processArgs(peerId, args, isMethod) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                args[i] = this._processObject(peerId, args[i]);
            }
        } else {
            return this._processObject(peerId, args);
        }
    }
}
