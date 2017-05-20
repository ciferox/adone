
const packageData = require("../../../../package.json");

module.exports = function (options) {
    return new StubTransport(options);
};

function StubTransport(options) {
    adone.std.events.EventEmitter.call(this);
    this.options = options || {};
    this.name = "Stub";
    this.version = packageData.version;
}
adone.std.util.inherits(StubTransport, adone.std.events.EventEmitter);

StubTransport.prototype.isIdle = function () {
    return true;
};

StubTransport.prototype.verify = function (callback) {
    setImmediate(() => {
        if (this.options.error) {
            return callback(new Error(this.options.error));
        }
        return callback(null, true);
    });
};

StubTransport.prototype.send = function (mail, callback) {

    if (this.options.error) {
        setImmediate(() => {
            callback(new Error(this.options.error));
        });
        return;
    }

    if (this.options.keepBcc) {
        mail.message.keepBcc = true;
    }

    const message = mail.message.createReadStream();
    const chunks = [];
    let chunklen = 0;
    const envelope = mail.data.envelope || mail.message.getEnvelope();

    this._log("info", "envelope", JSON.stringify(envelope));
    this.emit("envelope", envelope);

    message.on("error", (err) => {
        setImmediate(() => {
            callback(err);
        });
    });

    message.on("data", (chunk) => {
        chunks.push(chunk);
        chunklen += chunk.length;

        this._log("verbose", "message", chunk.toString());
        this.emit("data", chunk.toString());
    });

    message.on("end", () => {
        setImmediate(() => {
            const messageId = (mail.message.getHeader("message-id") || "").replace(/[<>\s]/g, "");
            const response = Buffer.concat(chunks, chunklen);
            const info = {
                envelope: mail.data.envelope || mail.message.getEnvelope(),
                messageId,
                response
            };
            this._log("info", "end", "Processed <%s> (%sB)", messageId, response.length);
            this.emit("end", info);
            callback(null, info);
        });
    });
};

/**
 * Log emitter
 * @param {String} level Log level
 * @param {String} type Optional type of the log message
 * @param {String} message Message to log
 */
StubTransport.prototype._log = function ( /* level, type, message */ ) {
    const args = Array.prototype.slice.call(arguments);
    const level = (args.shift() || "INFO").toUpperCase();
    const type = (args.shift() || "");
    const message = adone.std.util.format.apply(adone.std.util, args);

    this.emit("log", {
        name: packageData.name,
        version: packageData.version,
        level,
        type,
        message
    });
};
