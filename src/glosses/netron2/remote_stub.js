const {
    is,
    exception,
    util,
    netron2: { Definition }
} = adone;

const __ = adone.private(adone.netron2);

export default class RemoteStub {
    constructor(netron, iInstance) {
        this.netron = netron;
        this.iInstance = iInstance;
    }

    get definition() {
        if (is.undefined(this._def)) {
            const origDef = this.iInstance[__.I_DEFINITION_SYMBOL];
            const def = this._def = new Definition();

            def.id = this.netron._defUniqueId.get();
            def.parentId = 0;
            def.name = origDef.name;
            def.description = origDef.description;
            // def.twin = origDef.twin;
            def.$ = util.clone(origDef.$);
        }
        return this._def;
    }

    set(prop, data, peer) {
        let $ = this.definition.$;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, data, true);
                return this.iInstance[prop](...data);
            } else if (!$.readonly) {
                this._processArgs(peer, data, false);
                return this.iInstance[prop].set(data);
            }
            throw new exception.InvalidAccess(`${prop} is not writable`);
        }
        throw new exception.NotExists(`${prop} not exists`);
    }

    get(prop, defaultData, peer) {
        let $ = this.definition.$;
        if (prop in $) {
            $ = $[prop];
            if ($.method) {
                this._processArgs(peer, defaultData, true);
                return this.iInstance[prop](...defaultData);
            }
            this._processArgs(peer, defaultData, false);
            return this.iInstance[prop].get(defaultData);
        }
        throw new exception.NotExists(`${prop} not exists`);
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
        if (is.netron2Definition(obj)) {
            obj.$peer = peer;
        } else if (is.netron2Definitions(obj)) {
            for (let i = 0; i < obj.length; i++) {
                this._processObject(peer, obj.get(i));
            }
        }
    }
}
adone.tag.add(RemoteStub, "NETRON2_REMOTESTUB");