const {
    database: { redis: { __ } },
    is,
    util,
    promise,
    identity,
    noop,
    collection: { ByteArray }
} = adone;

export default class Command {
    constructor(name, args, options, callback) {
        if (is.undefined(options)) {
            options = {};
        }
        this.name = name;
        this.replyEncoding = options.replyEncoding;
        this.errorStack = options.errorStack;
        this.args = args ? util.flatten(args) : [];
        this.callback = callback || noop;
        this.initPromise();

        const { keyPrefix } = options;
        if (keyPrefix) {
            this._iterateKeys((key) => `${keyPrefix}${key}`);
        }
    }

    initPromise() {
        this.promise = promise.nodeify(new Promise((resolve, reject) => {
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
                    reject(__.util.optimizeErrorStack(err, this.errorStack, __dirname));
                };
            } else {
                this.reject = reject;
            }
        }), this.callback);
    }

    getSlot() {
        if (is.undefined(this._slot)) {
            const key = this.getKeys()[0];
            if (key) {
                this.slot = __.calculateSlot(key);
            } else {
                this.slot = null;
            }
        }
        return this.slot;
    }

    getKeys() {
        return this._iterateKeys();
    }

    _iterateKeys(transform) {
        if (is.undefined(this._keys)) {
            if (!is.function(transform)) {
                transform = identity;
            }
            this._keys = [];
            if (__.commands.exists(this.name)) {
                const keyIndexes = __.commands.getKeyIndexes(this.name, this.args);
                for (const index of keyIndexes) {
                    this.args[index] = transform(this.args[index]);
                    this._keys.push(this.args[index]);
                }
            }
        }
        return this._keys;
    }

    toWritable() {
        let bufferMode = false;
        for (let i = 0; i < this.args.length; ++i) {
            if (is.buffer(this.args[i])) {
                bufferMode = true;
                break;
            }
        }

        let result;
        const commandStr = `*${this.args.length + 1}\r\n$${this.name.length}\r\n${this.name}\r\n`;
        if (bufferMode) {
            const resultBuffer = new ByteArray(0);
            resultBuffer.write(commandStr);
            for (let i = 0; i < this.args.length; ++i) {
                const arg = this.args[i];
                if (arg instanceof Buffer) {
                    if (arg.length === 0) {
                        resultBuffer.write("$0\r\n\r\n");
                    } else {
                        resultBuffer.write(`$${arg.length}\r\n`);
                        resultBuffer.write(arg);
                        resultBuffer.write("\r\n");
                    }
                } else {
                    resultBuffer.write(`$${Buffer.byteLength(arg)}\r\n${arg}\r\n`);
                }
            }
            result = resultBuffer.flip().toBuffer();
        } else {
            result = commandStr;
            for (let i = 0; i < this.args.length; ++i) {
                result += `$${Buffer.byteLength(this.args[i])}\r\n${this.args[i]}\r\n`;
            }
        }
        return result;
    }

    stringifyArguments() {
        for (let i = 0; i < this.args.length; ++i) {
            if (!is.buffer(this.args[i]) && !is.string(this.args[i])) {
                this.args[i] = __.util.toArg(this.args[i]);
            }
        }
    }

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

    transformReply(result) {
        if (this.replyEncoding) {
            result = __.util.convertBufferToString(result, this.replyEncoding);
        }
        const transformer = Command._transformer.reply[this.name];
        if (transformer) {
            result = transformer(result);
        }

        return result;
    }

    static checkFlag(flagName, commandName) {
        return Boolean(flagMap[flagName][commandName]); // eslint-disable-line no-use-before-define
    }

    static setArgumentTransformer(name, func) {
        Command._transformer.argument[name] = func;
    }

    static setReplyTransformer(name, func) {
        Command._transformer.reply[name] = func;
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

const flagMap = util.keys(Command.FLAGS).reduce((map, flagName) => {
    map[flagName] = {};
    for (const commandName of Command.FLAGS[flagName]) {
        map[flagName][commandName] = true;
    }
    return map;
}, {});

Command._transformer = {
    argument: {},
    reply: {}
};

const msetArgumentTransformer = (args) => {
    if (args.length === 1) {
        if (is.map(args[0])) {
            return __.util.convertMapToArray(args[0]);
        }
        if (is.object(args[0])) {
            return __.util.convertObjectToArray(args[0]);
        }
    }
    return args;
};

Command.setArgumentTransformer("mset", msetArgumentTransformer);
Command.setArgumentTransformer("msetnx", msetArgumentTransformer);

Command.setArgumentTransformer("hmset", (args) => {
    if (args.length === 2) {
        if (is.map(args[1])) {
            return [args[0], ...__.util.convertMapToArray(args[1])];
        }
        if (is.object(args[1])) {
            return [args[0], ...__.util.convertObjectToArray(args[1])];
        }
    }
    return args;
});

Command.setReplyTransformer("hgetall", (result) => {
    if (is.array(result)) {
        const obj = {};
        for (let i = 0; i < result.length; i += 2) {
            obj[result[i]] = result[i + 1];
        }
        return obj;
    }
    return result;
});
