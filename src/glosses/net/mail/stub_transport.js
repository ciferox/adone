import adone from "adone";
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
    setImmediate(function () {
        if (this.options.error) {
            return callback(new Error(this.options.error));
        }
        return callback(null, true);
    }.bind(this));
};

StubTransport.prototype.send = function (mail, callback) {

    if (this.options.error) {
        setImmediate(function () {
            callback(new Error(this.options.error));
        }.bind(this));
        return;
    }

    if (this.options.keepBcc) {
        mail.message.keepBcc = true;
    }

    var message = mail.message.createReadStream();
    var chunks = [];
    var chunklen = 0;
    var envelope = mail.data.envelope || mail.message.getEnvelope();

    this._log("info", "envelope", JSON.stringify(envelope));
    this.emit("envelope", envelope);

    message.on("error", function (err) {
        setImmediate(function () {
            callback(err);
        });
    });

    message.on("data", function (chunk) {
        chunks.push(chunk);
        chunklen += chunk.length;

        this._log("verbose", "message", chunk.toString());
        this.emit("data", chunk.toString());
    }.bind(this));

    message.on("end", function () {
        setImmediate(function () {
            var messageId = (mail.message.getHeader("message-id") || "").replace(/[<>\s]/g, "");
            var response = Buffer.concat(chunks, chunklen);
            var info = {
                envelope: mail.data.envelope || mail.message.getEnvelope(),
                messageId: messageId,
                response: response
            };
            this._log("info", "end", "Processed <%s> (%sB)", messageId, response.length);
            this.emit("end", info);
            callback(null, info);
        }.bind(this));
    }.bind(this));
};

/**
 * Log emitter
 * @param {String} level Log level
 * @param {String} type Optional type of the log message
 * @param {String} message Message to log
 */
StubTransport.prototype._log = function ( /* level, type, message */ ) {
    var args = Array.prototype.slice.call(arguments);
    var level = (args.shift() || "INFO").toUpperCase();
    var type = (args.shift() || "");
    var message = adone.std.util.format.apply(adone.std.util, args);

    this.emit("log", {
        name: packageData.name,
        version: packageData.version,
        level: level,
        type: type,
        message: message
    });
};
