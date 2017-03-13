const { database: { redis }, is, std, promise } = adone;

export default class Script {
    constructor(lua, numberOfKeys, keyPrefix = "") {
        this.lua = lua;
        this.sha = std.crypto.createHash("sha1").update(this.lua).digest("hex");
        this.numberOfKeys = is.number(numberOfKeys) ? numberOfKeys : null;
        this.keyPrefix = keyPrefix;
    }

    execute(container, args, options, callback) {
        if (is.number(this.numberOfKeys)) {
            args.unshift(this.numberOfKeys);
        }
        if (this.keyPrefix) {
            options.keyPrefix = this.keyPrefix;
        }

        const evalsha = new redis.Command("evalsha", [this.sha, ...args], options);
        evalsha.isCustomCommand = true;
        const result = container.sendCommand(evalsha);
        if (is.promise(result)) {
            return promise.nodeify(result.catch((err) => {
                if (!err.toString().includes("NOSCRIPT")) {
                    throw err;
                }
                return container.sendCommand(new redis.Command("eval", [this.lua, ...args], options));
            }), callback);
        }

        // result is not a Promise--probably returned from a pipeline chain; however,
        // we still need the callback to fire when the script is evaluated
        promise.nodeify(evalsha.promise, callback);
        return result;
    }
}
