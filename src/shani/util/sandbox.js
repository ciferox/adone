const {
    error,
    shani: { util },
    lazify
} = adone;
const { __ } = util;

const exposeValue = (sandbox, config, key, value) => {
    if (!value) {
        return;
    }

    if (config.injectInto && !(key in config.injectInto)) {
        config.injectInto[key] = value;
        sandbox.injectedKeys.push(key);
    } else {
        sandbox.args.push(value);
    }
};

class Sandbox extends __.Collection {
    constructor(config = {}) {
        super(config);
        this.args = [];
        this.injectedKeys = [];
        this.injectInto = config.injectInto;
        const exposed = this.inject({});

        if (config.properties) {
            config.properties.forEach((prop) => {
                const value = exposed[prop] || prop === "sandbox";
                exposeValue(this, config, prop, value);
            });
        } else {
            exposeValue(this, config, "sandbox");
        }
    }

    inject(obj) {
        super.inject(obj);
        if (this.clock) {
            obj.clock = this.clock;
        }

        if (this.server) {
            obj.server = this.server;
            obj.requests = this.server.requests;
        }

        obj.match = util.match;

        return obj;
    }

    usingPromise(promiseLibrary) {

        this.promiseLibrary = promiseLibrary;

        return this;
    }

    restore(...args) {
        if (args.length) {
            throw new error.InvalidArgumentException("sandbox.restore() does not take any parameters. Perhaps you meant stub.restore()");
        }
        super.restore(...args);
        this.restoreContext();
    }

    restoreContext() {
        let injectedKeys = this.injectedKeys;
        const injectInto = this.injectInto;

        if (!injectedKeys) {
            return;
        }

        injectedKeys.forEach((injectedKey) => {
            delete injectInto[injectedKey];
        });

        injectedKeys = [];
    }
}

lazify({
    match: () => util.match,
    assert: () => util.assert
}, Sandbox.prototype);

export default function sandbox(object) {
    return new Sandbox(object);
}

sandbox.create = sandbox;
sandbox.Sandbox = Sandbox;
