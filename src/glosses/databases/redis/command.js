import adone from "adone";

const imports = adone.lazify({
    utils: "./utils",
    commands: "./commands",
    calculateSlot: "./cluster_key_slot"
}, null, require);

/**
 * Command instance
 *
 * It's rare that you need to create a Command instance yourself.
 *
 * @constructor
 * @param {string} name - Command name
 * @param {string[]} [args=null] - An array of command arguments
 * @param {object} [options]
 * @param {string} [options.replyEncoding=null] - Set the encoding of the reply,
 * by default buffer will be returned.
 * @param {function} [callback=null] - The callback that handles the response.
 * If omit, the response will be handled via Promise.
 * @example
 * ```js
 * var infoCommand = new Command('info', null, function (err, result) {
 *   console.log('result', result);
 * });
 *
 * redis.sendCommand(infoCommand);
 *
 * // When no callback provided, Command instance will have a `promise` property,
 * // which will resolve/reject with the result of the command.
 * var getCommand = new Command('get', ['foo']);
 * getCommand.promise.then(function (result) {
 *   console.log('result', result);
 * });
 * ```
 *
 * @see {@link Redis#sendCommand} which can send a Command instance to Redis
 * @public
 */
export default class Command {
    constructor(name, args, options, callback) {
        if (adone.is.undefined(options)) {
            options = {};
        }
        this.name = name;
        this.replyEncoding = options.replyEncoding;
        this.errorStack = options.errorStack;
        this.args = args ? adone.vendor.lodash.flatten(args) : [];
        this.callback = callback || adone.noop;
        this.initPromise();

        const { keyPrefix } = options;
        if (keyPrefix) {
            this._iterateKeys((key) => `${keyPrefix}${key}`);
        }
    }

    initPromise() {
        this.promise = adone.promise.nodeify(new Promise((resolve, reject) => {
            if (!this.transformed) {
                this.transformed = true;
                const transformer = Command._transformer.argument[this.name];
                if (transformer) {
                    this.args = transformer(this.args);
                }
                this.stringifyArguments();
            }

            this.resolve = this._convertValue(resolve);
            if (this.errorStack) {
                this.reject = (err) => {
                    reject(imports.utils.optimizeErrorStack(err, this.errorStack, __dirname));
                };
            } else {
                this.reject = reject;
            }
        }), this.callback);
    }

    getSlot() {
        if (adone.is.undefined(this._slot)) {
            const key = this.getKeys()[0];
            if (key) {
                this.slot = imports.calculateSlot(key);
            } else {
                this.slot = null;
            }
        }
        return this.slot;
    }

    getKeys() {
        return this._iterateKeys();
    }

    /**
     * Iterate through the command arguments that are considered keys.
     *
     * @param {function} [transform] - The transformation that should be applied to
     * each key. The transformations will persist.
     * @return {string[]} The keys of the command.
     * @private
     */
    _iterateKeys(transform) {
        if (adone.is.undefined(this._keys)) {
            if (!adone.is.function(transform)) {
                transform = adone.identity;
            }
            this._keys = [];
            if (imports.commands.exists(this.name)) {
                const keyIndexes = imports.commands.getKeyIndexes(this.name, this.args);
                for (const index of keyIndexes) {
                    this.args[index] = transform(this.args[index]);
                    this._keys.push(this.args[index]);
                }
            }
        }
        return this._keys;
    }

    /**
     * Convert command to writable buffer or string
     *
     * @return {string|Buffer}
     * @see {@link Redis#sendCommand}
     * @public
     */
    toWritable() {
        let bufferMode = false;
        let i;
        for (i = 0; i < this.args.length; ++i) {
            if (adone.is.buffer(this.args[i])) {
                bufferMode = true;
                break;
            }
        }

        let result;
        let arg;
        const commandStr = `*${this.args.length + 1}\r\n$${this.name.length}\r\n${this.name}\r\n`;
        if (bufferMode) {
            const resultBuffer = new adone.ExBuffer(0);
            resultBuffer.write(commandStr);
            for (i = 0; i < this.args.length; ++i) {
                arg = this.args[i];
                if (arg instanceof Buffer) {
                    if (arg.length === 0) {
                        resultBuffer.write("$0\r\n\r\n");
                    } else {
                        resultBuffer.write("$" + arg.length + "\r\n");
                        resultBuffer.write(arg);
                        resultBuffer.write("\r\n");
                    }
                } else {
                    resultBuffer.write("$" + Buffer.byteLength(arg) + "\r\n" + arg + "\r\n");
                }
            }
            result = resultBuffer.flip().toBuffer();
        } else {
            result = [commandStr];
            for (i = 0; i < this.args.length; ++i) {
                result.push(`$${Buffer.byteLength(this.args[i])}\r\n${this.args[i]}\r\n`);
            }
            result = result.join("");
        }
        return result;
    }

    stringifyArguments() {
        for (let i = 0; i < this.args.length; ++i) {
            if (!adone.is.buffer(this.args[i]) && !adone.is.string(this.args[i])) {
                this.args[i] = imports.utils.toArg(this.args[i]);
            }
        }
    }

    /**
     * Convert the value from buffer to the target encoding.
     *
     * @param {function} resolve - The resolve function of the Promise
     * @return {function} A funtion to transform and resolve a value
     * @private
     */
    _convertValue(resolve) {
        return (value) => {
            try {
                resolve(this.transformReply(value));
            } catch (err) {
                this.reject(err);
            }
            return this.promise;
        };
    }

    /**
     * Convert buffer/buffer[] to string/string[],
     * and apply reply transformer.
     *
     * @public
     */
    transformReply(result) {
        if (this.replyEncoding) {
            result = imports.utils.convertBufferToString(result, this.replyEncoding);
        }
        const transformer = Command._transformer.reply[this.name];
        if (transformer) {
            result = transformer(result);
        }

        return result;
    }
}

Command.FLAGS = {
    // Commands that can be processed when client is in the subscriber mode
    VALID_IN_SUBSCRIBER_MODE: ["subscribe", "psubscribe", "unsubscribe", "punsubscribe", "ping", "quit"],
    // Commands that are valid in monitor mode
    VALID_IN_MONITOR_MODE: ["monitor", "auth"],
    // Commands that will turn current connection into subscriber mode
    ENTER_SUBSCRIBER_MODE: ["subscribe", "psubscribe"],
    // Commands that may make current connection quit subscriber mode
    EXIT_SUBSCRIBER_MODE: ["unsubscribe", "punsubscribe"],
    // Commands that will make client disconnect from server TODO shutdown?
    WILL_DISCONNECT: ["quit"]
};

const flagMap = Object.keys(Command.FLAGS).reduce(function (map, flagName) {
    map[flagName] = {};
    Command.FLAGS[flagName].forEach(function (commandName) {
        map[flagName][commandName] = true;
    });
    return map;
}, {});

/**
 * Check whether the command has the flag
 *
 * @param {string} flagName
 * @param {string} commandName
 * @return {boolean}
 */
Command.checkFlag = function (flagName, commandName) {
    return !!flagMap[flagName][commandName];
};

Command._transformer = {
    argument: {},
    reply: {}
};

Command.setArgumentTransformer = function (name, func) {
    Command._transformer.argument[name] = func;
};

Command.setReplyTransformer = function (name, func) {
    Command._transformer.reply[name] = func;
};

function msetArgumentTransformer(args) {
    if (args.length === 1) {
        if (adone.is.map(args[0])) {
            return imports.utils.convertMapToArray(args[0]);
        }
        if (adone.is.object(args[0])) {
            return imports.utils.convertObjectToArray(args[0]);
        }
    }
    return args;
}

Command.setArgumentTransformer("mset", msetArgumentTransformer);
Command.setArgumentTransformer("msetnx", msetArgumentTransformer);

Command.setArgumentTransformer("hmset", function (args) {
    if (args.length === 2) {
        if (adone.is.map(args[1])) {
            return [args[0], ...imports.utils.convertMapToArray(args[1])];
        }
        if (adone.is.object(args[1])) {
            return [args[0], ...imports.utils.convertObjectToArray(args[1])];
        }
    }
    return args;
});

Command.setReplyTransformer("hgetall", function (result) {
    if (adone.is.array(result)) {
        const obj = {};
        for (let i = 0; i < result.length; i += 2) {
            obj[result[i]] = result[i + 1];
        }
        return obj;
    }
    return result;
});