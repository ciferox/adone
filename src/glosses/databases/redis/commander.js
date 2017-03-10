

const imports = adone.lazify({
    Command: "./command",
    Script: "./script",
    commands: "./commands"
}, null, require);

const commands = [...adone.vendor.lodash.difference(imports.commands.list, ["monitor"]), "sentinel"];

const DROP_BUFFER_SUPPORT_ERROR = "*Buffer methods are not available because \"dropBufferSupport\" option is enabled.";
/**
 * Commander
 *
 * This is the base class of Redis, Redis.Cluster and Pipeline
 *
 * @param {boolean} [options.showFriendlyErrorStack=false] - Whether to show a friendly error stack.
 * Will decrease the performance significantly.
 * @constructor
 */
const mixin = (Sup) => {
    const Commander = class Commander extends Sup {
        constructor() {
            super();
            this.options = adone.vendor.lodash.defaults({}, this.options || {}, {
                showFriendlyErrorStack: false
            });
            this.scriptsSet = {};
        }

        /**
         * Return supported builtin commands
         *
         * @return {string[]} command list
         * @public
         */
        getBuiltinCommands() {
            return adone.vendor.lodash.close(commands);
        }

        /**
         * Create a builtin command
         *
         * @param {string} commandName - command name
         * @return {object} functions
         * @public
         */
        createBuiltinCommand(commandName) {
            return {
                string: generateFunction(commandName, "utf8"),
                buffer: generateFunction(commandName, null)
            };
        }

        /**
         * Define a custom command using lua script
         *
         * @param {string} name - the command name
         * @param {object} definition
         * @param {string} definition.lua - the lua code
         * @param {number} [definition.numberOfKeys=null] - the number of keys.
         * If omit, you have to pass the number of keys as the first argument every time you invoke the command
         */
        defineCommand(name, definition) {
            const script = new imports.Script(definition.lua, definition.numberOfKeys, this.options.keyPrefix);
            this.scriptsSet[name] = script;
            this[name] = generateScriptingFunction(script, "utf8");
            this[`${name}Buffer`] = generateScriptingFunction(script, null);
        }

        /**
         * Send a command
         *
         * @abstract
         * @public
         */
        sendCommand() {}
    };

    for (const commandName of commands) {
        Commander.prototype[commandName] = generateFunction(commandName, "utf8");
        Commander.prototype[`${commandName}Buffer`] = generateFunction(commandName, null);
    }

    Commander.prototype.call = generateFunction("utf8");
    Commander.prototype.callBuffer = generateFunction(null);
    Commander.prototype.send_command = Commander.prototype.call;

    return Commander;
};

function generateFunction(_commandName, _encoding) {
    if (adone.is.undefined(_encoding)) {
        _encoding = _commandName;
        _commandName = null;
    }
    return function () {
        let firstArgIndex = 0;
        let commandName = _commandName;
        if (commandName === null) {
            commandName = arguments[0];
            firstArgIndex = 1;
        }
        let length = arguments.length;
        const lastArgIndex = length - 1;
        let callback = arguments[lastArgIndex];
        if (!adone.is.function(callback)) {
            callback = undefined;
        } else {
            length = lastArgIndex;
        }
        const args = new Array(length - firstArgIndex);
        for (let i = firstArgIndex; i < length; ++i) {
            args[i - firstArgIndex] = arguments[i];
        }

        let options;
        if (this.options.dropBufferSupport) {
            if (!_encoding) {
                return adone.promise.nodeify(Promise.reject(new Error(DROP_BUFFER_SUPPORT_ERROR)), callback);
            }
            options = { replyEncoding: null };
        } else {
            options = { replyEncoding: _encoding };
        }

        if (this.options.showFriendlyErrorStack) {
            options.errorStack = new Error().stack;
        }
        if (this.options.keyPrefix) {
            options.keyPrefix = this.options.keyPrefix;
        }
        return this.sendCommand(new imports.Command(commandName, args, options, callback));
    };
}

function generateScriptingFunction(_script, _encoding) {
    return function () {
        let length = arguments.length;
        const lastArgIndex = length - 1;
        let callback = arguments[lastArgIndex];
        if (!adone.is.function(callback)) {
            callback = undefined;
        } else {
            length = lastArgIndex;
        }
        const args = new Array(length);
        for (let i = 0; i < length; i++) {
            args[i] = arguments[i];
        }

        let options;
        if (this.options.dropBufferSupport) {
            if (!_encoding) {
                return adone.promise.nodeify(Promise.reject(new Error(DROP_BUFFER_SUPPORT_ERROR)), callback);
            }
            options = { replyEncoding: null };
        } else {
            options = { replyEncoding: _encoding };
        }

        if (this.options.showFriendlyErrorStack) {
            options.errorStack = new Error().stack;
        }

        return _script.execute(this, args, options, callback);
    };
}

const Commander = mixin(Object);
Commander.mixin = mixin;

export default Commander;