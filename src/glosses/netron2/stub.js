const {
    is,
    exception,
    netron2: { Definition, Definitions, Reflection }
} = adone;

export default class Stub {
    constructor(netron, obj) {
        this.netron = netron;
        if (is.netron2Context(obj)) {
            this.instance = obj;
            this.reflection = Reflection.from(obj);
        } else {
            this.instance = obj.instance;
            this.reflection = obj;
        }
        this._def = null;
    }

    get definition() {
        if (is.null(this._def)) {
            const r = this.reflection;
            const def = this._def = new Definition();

            def.id = this.netron._defUniqueId.get();
            def.parentId = 0;
            def.name = r.getName();
            def.description = r.getDescription();
            if (r.hasTwin()) {
                def.twin = r.getTwin();
            }

            const methods = r.getMethods();
            const $ = def.$ = {};
            for (const [method, meta] of methods) {
                const args = [];
                for (const arg of meta.args) {
                    args.push([Reflection.getNameOfType(arg[0]), arg[1]]);
                }
                $[method] = {
                    method: true,
                    type: Reflection.getNameOfType(meta.type),
                    args,
                    description: meta.description
                };
            }
            const properties = r.getProperties();
            for (const [prop, meta] of properties) {
                $[prop] = {
                    type: Reflection.getNameOfType(meta.type),
                    readonly: meta.readonly,
                    description: meta.description
                };
            }
        }
        return this._def;
    }

    set(prop, data, peer) {
        let $ = this.definition.$;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, data, true);
                const result = this.instance[prop](...data);
                if (is.promise(result)) {
                    return result.then(adone.noop);
                }
                return undefined;
            } else if (!$.readonly) {
                data = this._processArgs(peer, data, false);
                this.instance[prop] = data;
                return undefined;
            }
            throw new exception.InvalidAccess(`${prop} is not writable`);
        }
        throw new exception.NotExists(`Property '${prop}' not exists`);
    }

    get(prop, defaultData, peer) {
        let $ = this.definition.$;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, defaultData, true);
                const result = this.instance[prop](...defaultData);
                if (is.promise(result)) {
                    return result.then((result) => this._processResult(peer, result));
                }
                return this._processResult(peer, result);
            }
            let val = this.instance[prop];
            if (is.undefined(val)) {
                defaultData = this._processArgs(peer, defaultData, false);
                val = defaultData;
            } else {
                val = this._processResult(peer, val);
            }
            return val;
        }
        throw new exception.NotExists(`Property '${prop}' not exists`);
    }

    _processResult(peer, result) {
        if (is.netron2Context(result)) {
            result = this.netron.refContext(peer.info, result);
            result.parentId = result.parentId || this._def.id;
            result.uid = peer.info.id.asBase58(); // definition owner
        } else if (is.netron2Definitions(result)) {
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
        if (is.netron2Reference(obj)) {
            const stub = this.netron._getStub(obj.defId);
            if (is.undefined(stub)) {
                throw new exception.Unknown(`Unknown definition id ${obj.defId}`);
            }
            return stub.instance;
        } else if (is.netron2Definition(obj)) {
            peer._updateDefinitions({ weak: obj });
            return this.netron.interfaceFactory.create(obj, peer);
        } else if (is.netron2Definitions(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj.set(i, this._processObject(peer, obj.get(i)));
            }
        }
        return obj;
    }
}
adone.tag.add(Stub, "NETRON2_STUB");
