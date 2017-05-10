const { is, x, vendor: { lodash }, netron: { Definition } } = adone;

export default class RemoteStub {
    constructor(netron, iInstance) {
        this.netron = netron;
        this.iInstance = iInstance;
    }

    get definition() {
        if (is.undefined(this._def)) {
            const origDef = this.iInstance.$def;
            const def = this._def = new Definition();

            def.id = this.netron.uniqueDefId.next();
            def.parentId = 0;
            def.name = origDef.name;
            def.description = origDef.description;
            def.twin = origDef.twin;
            def.$ = lodash.cloneDeep(origDef.$);
        }
        return this._def;
    }

    set(prop, data, peer) {
        let $ = this.definition.$;
        const target = this.iInstance;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, data, true);
                return target[prop].apply(this.iInstance, data);
            } else if (!$.readonly) {
                this._processArgs(peer, data, false);
                return target[prop].set(data);
            }
            return Promise.reject(new x.InvalidAccess(`${prop} is not writable`));
        }
        return Promise.reject(new x.NotExists(`${prop} not exists`));

    }

    get(prop, defaultData, peer) {
        let $ = this.definition.$;
        const target = this.iInstance;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, defaultData, true);
                return target[prop].apply(this.iInstance, defaultData);
            }
            this._processArgs(peer, defaultData, false);
            return target[prop].get(defaultData);
        }
        return Promise.reject(new x.NotExists(`${prop} not exists`));
    }

    _processArgs(peer, args, isMethod) {
        if (isMethod && is.array(args)) {
            for (let i = 0; i < args.length; ++i) {
                this._processObject(peer, args[i]);
            }
        } else {
            return this._processObject(peer, args);
        }
    }

    _processObject(peer, obj) {
        if (is.netronDefinition(obj)) {
            obj.$peer = peer;
        } else if (is.netronDefinitions(obj)) {
            for (let i = 0; i < obj.length; i++) {
                this._processObject(peer, obj.get(i));
            }
        }
    }
}
adone.tag.set(RemoteStub, adone.tag.NETRON_REMOTESTUB);
