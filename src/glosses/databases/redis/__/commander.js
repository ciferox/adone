const {
    database: { redis },
    exception,
    is,
    promise,
    lazify
} = adone;

const __ = adone.private(redis);

const lazy = lazify({
    commands: () => ["sentinel", ...__.commands.list.filter((x) => x !== "monitor")]
}, null, require);

const DROP_BUFFER_SUPPORT_ERROR = "*Buffer methods are not available because \"dropBufferSupport\" option is enabled.";

const generateFunction = (_commandName, _encoding) => {
    if (is.undefined(_encoding)) {
        [_commandName, _encoding] = [null, _commandName];
    }
    return function (...args) {
        let firstArgIndex = 0;
        let commandName = _commandName;
        if (is.null(commandName)) {
            commandName = args[0];
            firstArgIndex = 1;
        }
        let { length } = args;
        const lastArgIndex = length - 1;
        let callback = args[lastArgIndex];
        if (!is.function(callback)) {
            callback = undefined;
        } else {
            length = lastArgIndex;
        }

        args = args.slice(firstArgIndex, length);

        let options;
        if (this.options.dropBufferSupport) {
            if (!_encoding) {
                return promise.nodeify(
                    Promise.reject(new exception.Exception(DROP_BUFFER_SUPPORT_ERROR)),
                    callback
                );
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
        return this.sendCommand(new __.Command(commandName, args, options, callback));
    };
};

const generateScriptingFunction = (_script, _encoding) => {
    return function (...args) {
        let { length } = args;
        const lastArgIndex = length - 1;
        let callback = args[lastArgIndex];
        if (!is.function(callback)) {
            callback = undefined;
        } else {
            length = lastArgIndex;
        }

        let options;
        if (this.options.dropBufferSupport) {
            if (!_encoding) {
                return promise.nodeify(
                    Promise.reject(new exception.Exception(DROP_BUFFER_SUPPORT_ERROR)),
                    callback
                );
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
};

const mixin = (Sup) => {
    const Commander = class Commander extends Sup {
        constructor() {
            super();
            this.options = {
                showFriendlyErrorStack: false,
                ...this.options
            };
            this.scriptsSet = {};
        }

        getBuiltinCommands() {
            return [...lazy.commands];
        }

        createBuiltinCommand(commandName) {
            return {
                string: generateFunction(commandName, "utf8"),
                buffer: generateFunction(commandName, null)
            };
        }

        defineCommand(name, definition) {
            const script = new __.Script(
                definition.lua,
                definition.numberOfKeys,
                this.options.keyPrefix
            );
            this.scriptsSet[name] = script;
            this[name] = generateScriptingFunction(script, "utf8");
            this[`${name}Buffer`] = generateScriptingFunction(script, null);
        }

        sendCommand() {}
    };

    for (const commandName of lazy.commands) {
        Commander.prototype[commandName] = generateFunction(commandName, "utf8");
        Commander.prototype[`${commandName}Buffer`] = generateFunction(commandName, null);
    }

    Commander.prototype.call = generateFunction("utf8");
    Commander.prototype.callBuffer = generateFunction(null);

    return Commander;
};

const Commander = mixin(Object);
Commander.mixin = mixin;

export default Commander;
