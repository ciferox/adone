const {
    is,
    error,
    util,
    netron: { Definition }
} = adone;

const __ = adone.private(adone.netron);

export default class RemoteStub {
    constructor(manager, iInstance) {
        this.manager = manager;
        this.iInstance = iInstance;
        this._def = null;
    }

    get definition() {
        if (is.null(this._def)) {
            const origDef = this.iInstance[__.I_DEFINITION_SYMBOL];
            const def = this._def = new Definition();

            def.id = this.manager.uid.create();
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
            throw new error.InvalidAccessException(`${prop} is not writable`);
        }
        throw new error.NotExistsException(`${prop} not exists`);
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
        throw new error.NotExistsException(`${prop} not exists`);
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
