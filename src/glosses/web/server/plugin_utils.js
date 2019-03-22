const {
    assert,
    is
} = adone;

const registeredPlugins = Symbol.for("registered-plugin");
const {
    kReply,
    kRequest
} = require("./symbols.js");

function getMeta(fn) {
    return fn[Symbol.for("plugin-meta")];
}

function shouldSkipOverride(fn) {
    return Boolean(fn[Symbol.for("skip-override")]);
}

function checkDependencies(fn) {
    const meta = getMeta(fn);
    if (!meta) {
        return; 
    }

    const dependencies = meta.dependencies;
    if (!dependencies) {
        return; 
    }
    assert(is.array(dependencies), "The dependencies should be an array of strings");

    dependencies.forEach((dependency) => {
        assert(
            this[registeredPlugins].indexOf(dependency) > -1,
            `The dependency '${dependency}' of plugin '${meta.name}' is not registered`
        );
    });
}

function checkDecorators(fn) {
    const meta = getMeta(fn);
    if (!meta) {
        return; 
    }

    const decorators = meta.decorators;
    if (!decorators) {
        return; 
    }

    if (decorators.fastify) {
        _checkDecorators.call(this, "Fastify", decorators.fastify); 
    }
    if (decorators.reply) {
        _checkDecorators.call(this[kReply], "Reply", decorators.reply); 
    }
    if (decorators.request) {
        _checkDecorators.call(this[kRequest], "Request", decorators.request); 
    }
}

function _checkDecorators(instance, decorators) {
    assert(is.array(decorators), "The decorators should be an array of strings");

    decorators.forEach((decorator) => {
        assert(
            instance === "Fastify" ? decorator in this : decorator in this.prototype,
            `The decorator '${decorator}' is not present in ${instance}`
        );
    });
}

function registerPluginName(fn) {
    const meta = getMeta(fn);
    if (!meta) {
        return; 
    }

    const name = meta.name;
    if (!name) {
        return; 
    }
    this[registeredPlugins].push(name);
}

function registerPlugin(fn) {
    registerPluginName.call(this, fn);
    checkDecorators.call(this, fn);
    checkDependencies.call(this, fn);
    return shouldSkipOverride(fn);
}

module.exports = {
    registeredPlugins,
    registerPlugin
};

module.exports[Symbol.for("internals")] = {
    shouldSkipOverride,
    getMeta,
    checkDecorators,
    checkDependencies
};
