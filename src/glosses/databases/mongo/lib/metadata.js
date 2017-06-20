const { is } = adone;
const f = require("util").format;

const Define = function (name, object, stream) {
    this.name = name;
    this.object = object;
    this.stream = typeof stream === "boolean" ? stream : false;
    this.instrumentations = {};
};

Define.prototype.classMethod = function (name, options) {
    const keys = Object.keys(options).sort();
    const key = generateKey(keys, options);

    // Add a list of instrumentations
    if (this.instrumentations[key] == null) {
        this.instrumentations[key] = {
            methods: [], options
        };
    }

    // Push to list of method for this instrumentation
    this.instrumentations[key].methods.push(name);
};

const generateKey = function (keys, options) {
    const parts = [];
    for (let i = 0; i < keys.length; i++) {
        parts.push(f("%s=%s", keys[i], options[keys[i]]));
    }

    return parts.join();
};

Define.prototype.staticMethod = function (name, options) {
    options.static = true;
    const keys = Object.keys(options).sort();
    const key = generateKey(keys, options);

    // Add a list of instrumentations
    if (this.instrumentations[key] == null) {
        this.instrumentations[key] = {
            methods: [], options
        };
    }

    // Push to list of method for this instrumentation
    this.instrumentations[key].methods.push(name);
};

Define.prototype.generate = function () {
    // Generate the return object
    const object = {
        name: this.name, obj: this.object, stream: this.stream,
        instrumentations: []
    };

    for (const name in this.instrumentations) {
        object.instrumentations.push(this.instrumentations[name]);
    }

    return object;
};

module.exports = Define;

const ensureDefine = (cls) => {
    if (!cls.define) {
        cls.define = new Define(undefined, cls);
    }
};

module.exports.metadata = (name, { stream = false } = {}) => (cls) => {
    ensureDefine(cls);
    cls.define.name = name;
    cls.define.stream = stream;
};

module.exports.metadata.classMethod = (options) => (target, key, descriptor) => {
    ensureDefine(target);
    if (options.fluent) {
        options.returns = [target];
    }
    target.define.classMethod(key, options);
    return descriptor;
};

module.exports.metadata.staticMethod = (options) => (target, key, descriptor) => {
    ensureDefine(target);
    target.define.staticMethod(key, options);
    return descriptor;
};


