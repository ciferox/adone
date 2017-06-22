const { is } = adone;

const generateKey = function (keys, options) {
    const parts = [];
    for (let i = 0; i < keys.length; i++) {
        parts.push(`${keys[i]}=${options[keys[i]]}`);
    }

    return parts.join();
};

class Define {
    constructor(name, object, stream) {
        this.name = name;
        this.object = object;
        this.stream = is.boolean(stream) ? stream : false;
        this.instrumentations = {};
    }

    classMethod(name, options) {
        const keys = Object.keys(options).sort();
        const key = generateKey(keys, options);

        // Add a list of instrumentations
        if (is.nil(this.instrumentations[key])) {
            this.instrumentations[key] = {
                methods: [], options
            };
        }

        // Push to list of method for this instrumentation
        this.instrumentations[key].methods.push(name);
    }

    staticMethod(name, options) {
        options.static = true;
        const keys = Object.keys(options).sort();
        const key = generateKey(keys, options);

        // Add a list of instrumentations
        if (is.nil(this.instrumentations[key])) {
            this.instrumentations[key] = {
                methods: [], options
            };
        }

        // Push to list of method for this instrumentation
        this.instrumentations[key].methods.push(name);
    }

    generate() {
        // Generate the return object
        const object = {
            name: this.name, obj: this.object, stream: this.stream,
            instrumentations: []
        };

        for (const name in this.instrumentations) {
            object.instrumentations.push(this.instrumentations[name]);
        }

        return object;
    }
}

const ensureDefine = (cls) => {
    if (!cls.define) {
        cls.define = new Define(undefined, cls);
    }
};

const metadata = (name, { stream = false } = {}) => (cls) => {
    ensureDefine(cls);
    cls.define.name = name;
    cls.define.stream = stream;
};

metadata.classMethod = (options) => (target, key, descriptor) => {
    ensureDefine(target);
    if (options.fluent) {
        options.returns = [target];
    }
    target.define.classMethod(key, options);
    return descriptor;
};

metadata.staticMethod = (options) => (target, key, descriptor) => {
    ensureDefine(target);
    target.define.staticMethod(key, options);
    return descriptor;
};

export default metadata;


