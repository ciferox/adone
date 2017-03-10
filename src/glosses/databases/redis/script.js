

const imports = adone.lazify({
    Command: "./command"
}, null, require);

export default class Script {
    constructor(lua, numberOfKeys, keyPrefix) {
        this.lua = lua;
        this.sha = adone.std.crypto.createHash("sha1").update(this.lua).digest("hex");
        this.numberOfKeys = adone.is.number(numberOfKeys) ? numberOfKeys : null;
        this.keyPrefix = keyPrefix || "";
    }

    execute(container, args, options, callback) {
        if (adone.is.number(this.numberOfKeys)) {
            args.unshift(this.numberOfKeys);
        }
        if (this.keyPrefix) {
            options.keyPrefix = this.keyPrefix;
        }

        const evalsha = new imports.Command("evalsha", [this.sha, ...args], options);
        evalsha.isCustomCommand = true;
        const result = container.sendCommand(evalsha);
        if (adone.is.promise(result)) {
            return adone.promise.nodeify(result.catch((err) => {
                if (err.toString().indexOf("NOSCRIPT") === -1) {
                    throw err;
                }
                return container.sendCommand(new imports.Command("eval", [this.lua, ...args], options));
            }), callback);
        }

        // result is not a Promise--probably returned from a pipeline chain; however,
        // we still need the callback to fire when the script is evaluated
        adone.promise.nodeify(evalsha.promise, callback);

        return result;
    }
}

