const { is, x, netron: { Definition, Definitions, Investigator } } = adone;

export default class Stub {
    constructor(netron, instance, ci) {
        this.netron = netron;
        this.instance = instance;
        this._ci = ci || new Investigator(instance);
        this._def = null;
    }

    investigator() {
        return this._ci;
    }

    get definition() {
        if (is.null(this._def)) {
            const ci = this._ci;
            const def = this._def = new Definition();

            def.id = this.netron.uniqueDefId.next();
            def.parentId = 0;
            def.name = ci.getName();
            def.description = ci.getDescription();
            if (ci.hasTwin()) {
                def.twin = ci.getTwin();
            }

            const pubMethods = ci.getPublicMethods();
            const $ = def.$ = {};
            for (const [method, meta] of pubMethods) {
                const args = [];
                for (const arg of meta.args) {
                    args.push([Investigator.getNameOfType(arg[0]), arg[1]]);
                }
                $[method] = { method: true, type: Investigator.getNameOfType(meta.type), args, description: meta.description };
            }
            const pubProps = ci.getPublicProperties();
            for (const [prop, meta] of pubProps) {
                $[prop] = { type: Investigator.getNameOfType(meta.type), readonly: meta.readonly, description: meta.description };
            }
        }
        return this._def;
    }

    set(prop, data, peer = null) {
        let $ = this.definition.$;
        const target = this.instance;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, data, true);
                return Reflect.apply(target[prop], this.instance, data);
            } else if (!$.readonly) {
                data = this._processArgs(peer, data, false);
                target[prop] = data;
            } else {
                return Promise.reject(new x.InvalidAccess(`${prop} is not writable`));
            }
            return Promise.resolve(true);
        }
        return Promise.reject(new x.NotExists(`${prop} not exists`));

    }

    get(prop, defaultData, peer = null) {
        let $ = this.definition.$;
        const target = this.instance;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, defaultData, true);
                return new Promise((resolve) => {
                    resolve(target[prop].apply(this.instance, defaultData));
                }).then((result) => {
                    return this._processResult(peer, result);
                });
            }
            let val = target[prop];
            if (is.undefined(val)) {
                defaultData = this._processArgs(peer, defaultData, false);
                val = defaultData;
            } else {
                val = this._processResult(peer, val);
            }
            return Promise.resolve(val);
        }
        return Promise.reject(new x.NotExists(`${prop} not exists`));
    }

    _processResult(peer, result) {
        if (Investigator.isContextable(result)) {
            const uid = (is.null(peer) ? peer : peer.uid);
            result = this.netron.refContext(uid, result);
            result.parentId = result.parentId || this._def.id;
            result.uid = uid; // definition owner uid
        } else if (is.netronDefinitions(result)) {
            const newDefs = new Definitions();
            for (let i = 0; i < result.length; i++) {
                const obj = result.get(i);
                newDefs.push(this._processResult(peer, obj));
            }
            return newDefs;
        }
        return result;
    }

    _processArgs(peer, args, isMethod) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                args[i] = this._processObject(peer, args[i]);
            }
        } else {
            return this._processObject(peer, args);
        }
    }

    _processObject(peer, obj) {
        if (is.netronReference(obj)) {
            const stub = this.netron.getStubById(obj.defId);
            if (is.undefined(stub)) {
                throw new x.Unknown(`unknown definition id ${obj.defId}`);
            }
            return stub.instance;
        } else if (is.netronDefinition(obj)) {
            let uid = null;
            if (!is.null(peer)) {
                uid = peer.uid;
                peer._updateDefinitions({ weak: obj });
            }
            return this.netron._createInterface(obj, uid);
        } else if (is.netronDefinitions(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj.set(i, this._processObject(peer, obj.get(i)));
            }
        }
        return obj;
    }
}
adone.tag.set(Stub, adone.tag.NETRON_STUB);
