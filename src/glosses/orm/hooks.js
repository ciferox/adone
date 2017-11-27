const {
    is,
    vendor: { lodash: _ },
    orm
} = adone;

const {
    util
} = orm;

const debug = util.getLogger().debugContext("hooks");

const hookTypes = {
    beforeValidate: { params: 2 },
    afterValidate: { params: 2 },
    validationFailed: { params: 3 },
    beforeCreate: { params: 2 },
    afterCreate: { params: 2 },
    beforeDestroy: { params: 2 },
    afterDestroy: { params: 2 },
    beforeRestore: { params: 2 },
    afterRestore: { params: 2 },
    beforeUpdate: { params: 2 },
    afterUpdate: { params: 2 },
    beforeSave: { params: 2, proxies: ["beforeUpdate", "beforeCreate"] },
    afterSave: { params: 2, proxies: ["afterUpdate", "afterCreate"] },
    beforeUpsert: { params: 2 },
    afterUpsert: { params: 2 },
    beforeBulkCreate: { params: 2 },
    afterBulkCreate: { params: 2 },
    beforeBulkDestroy: { params: 1 },
    afterBulkDestroy: { params: 1 },
    beforeBulkRestore: { params: 1 },
    afterBulkRestore: { params: 1 },
    beforeBulkUpdate: { params: 1 },
    afterBulkUpdate: { params: 1 },
    beforeFind: { params: 1 },
    beforeFindAfterExpandIncludeAll: { params: 1 },
    beforeFindAfterOptions: { params: 1 },
    afterFind: { params: 2 },
    beforeCount: { params: 1 },
    beforeDefine: { params: 2, sync: true },
    afterDefine: { params: 1, sync: true },
    beforeInit: { params: 2, sync: true },
    afterInit: { params: 1, sync: true },
    beforeConnect: { params: 1 },
    afterConnect: { params: 2 },
    beforeSync: { params: 1 },
    afterSync: { params: 1 },
    beforeBulkSync: { params: 1 },
    afterBulkSync: { params: 1 }
};
exports.hooks = hookTypes;

const hookAliases = {
    beforeDelete: "beforeDestroy",
    afterDelete: "afterDestroy",
    beforeBulkDelete: "beforeBulkDestroy",
    afterBulkDelete: "afterBulkDestroy",
    beforeConnection: "beforeConnect"
};
exports.hookAliases = hookAliases;

/**
 * get array of current hook and its proxied hooks combined
 * @private
 */
const getProxiedHooks = (hookType) =>
    hookTypes[hookType].proxies
        ? hookTypes[hookType].proxies.concat(hookType)
        : [hookType];

const getHooks = function (hookType) {
    return (this.options.hooks || {})[hookType] || [];
};

const Hooks = {
    /**
     * Process user supplied hooks definition
     *
     * @param {Object} hooks
     *
     * @private
     * @memberOf Sequelize
     * @memberOf Sequelize.Model
     */
    _setupHooks(hooks) {
        this.options.hooks = {};
        _.map(hooks || {}, (hooksArray, hookName) => {
            if (!_.isArray(hooksArray)) {
                hooksArray = [hooksArray];
            }
            hooksArray.forEach((hookFn) => this.addHook(hookName, hookFn));
        });
    },

    runHooks(hooks) {
        // TODO: fix that
        if (!hooks) {
            throw new Error("runHooks requires atleast 1 argument");
        }

        const hookArgs = util.sliceArgs(arguments, 1);
        let hookType;

        if (is.string(hooks)) {
            hookType = hooks;
            hooks = getHooks.call(this, hookType);

            if (this.sequelize) {
                hooks = hooks.concat(getHooks.call(this.sequelize, hookType));
            }
        }

        if (!is.array(hooks)) {
            hooks = [hooks];
        }

        // synchronous hooks
        if (hookTypes[hookType] && hookTypes[hookType].sync) {
            for (let hook of hooks) {
                if (typeof hook === "object") {
                    hook = hook.fn;
                }

                debug(`running hook(sync) ${hookType}`);
                hook.apply(this, hookArgs);
            }
            return;
        }

        // asynchronous hooks (default)

        return Promise.resolve((async () => {
            for (let hook of hooks) {
                if (typeof hook === "object") {
                    hook = hook.fn;
                }

                debug(`running hook ${hookType}`);
                await hook.apply(this, hookArgs);
            }
        })());
    },

    hook() {
        return Hooks.addHook.apply(this, arguments);
    },

    /**
     * Add a hook to the model
     *
     * @param {String}    hookType
     * @param {String}    [name]    Provide a name for the hook function. It can be used to remove the hook later or to order hooks based on some sort of priority system in the future.
     * @param {Function}  fn        The hook function
     *
     * @memberOf Sequelize
     * @memberOf Sequelize.Model
     */
    addHook(hookType, name, fn) {
        if (is.function(name)) {
            fn = name;
            name = null;
        }

        debug(`adding hook ${hookType}`);
        hookType = hookAliases[hookType] || hookType;

        // check for proxies, add them too
        hookType = getProxiedHooks(hookType);

        _.each(hookType, (type) => {
            this.options.hooks[type] = getHooks.call(this, type);
            this.options.hooks[type].push(name ? { name, fn } : fn);
        });

        return this;
    },

    /**
     * Remove hook from the model
     *
     * @param {String} hookType
     * @param {String|Function} name
     *
     * @memberOf Sequelize
     * @memberOf Sequelize.Model
     */
    removeHook(hookType, name) {
        hookType = hookAliases[hookType] || hookType;
        const isReference = is.function(name) ? true : false;

        if (!this.hasHook(hookType)) {
            return this;
        }

        util.debug(`removing hook ${hookType}`);

        // check for proxies, add them too
        hookType = getProxiedHooks(hookType);

        for (const type of hookType) {
            this.options.hooks[type] = this.options.hooks[type].filter((hook) => {
                if (isReference && is.function(hook)) {
                    return hook !== name; // check if same method
                } else if (!isReference && typeof hook === "object") {
                    return hook.name !== name;
                }
                return true;
            });
        }

        return this;
    },
    removeAllHooks(hookType) {
        hookType = hookAliases[hookType] || hookType;
        if (is.undefined(hookType)) {
            this.options.hooks = {};
        } else {
            this.options.hooks[hookType] = [];
        }
    },
    /**
     * Check whether the mode has any hooks of this type
     *
     * @param {String}  hookType
     *
     * @alias hasHooks
     * @memberOf Sequelize
     * @memberOf Sequelize.Model
     */
    hasHook(hookType) {
        return this.options.hooks[hookType] && Boolean(this.options.hooks[hookType].length);
    }
};
Hooks.hasHooks = Hooks.hasHook;


const applyTo = (target) => {
    _.mixin(target, Hooks);

    const allHooks = Object.keys(hookTypes).concat(Object.keys(hookAliases));
    for (const hook of allHooks) {
        target[hook] = function (name, callback) {
            return this.addHook(hook, name, callback);
        };
    }
};
exports.applyTo = applyTo;

export const interfaceFor = (source) => {
    const _interface = {
        replaceAliases(hooks) {
            return source.replaceAliases(hooks);
        },
        add(hookType, name, fn) {
            return source.addHook(hookType, name, fn);
        },
        remove(hookType, name) {
            return source.removeHook(hookType, name);
        },
        removeAll(hookType) {
            return source.removeAllHooks(hookType);
        },
        has(hookType) {
            return source.hasHook(hookType);
        }
    };
    const allHooks = Object.keys(hookTypes).concat(Object.keys(hookAliases));
    for (const hook of allHooks) {
        _interface[hook] = function (name, callback) {
            return source.addHook(hook, name, callback);
        };
    }
    return _interface;
};
