
const SMTPConnection = adone.net.mail.smtpConnection;
const assign = adone.net.mail.assign;

module.exports = PoolResource;

/**
 * Creates an element for the pool
 *
 * @constructor
 * @param {Object} options SMTPPool instance
 */
function PoolResource(pool) {
    adone.std.events.EventEmitter.call(this);
    this.pool = pool;
    this.options = pool.options;

    this.logger = this.options.logger;

    this._connection = false;
    this._connected = false;

    this.messages = 0;
    this.available = true;
}
adone.std.util.inherits(PoolResource, adone.std.events.EventEmitter);

/**
 * Initiates a connection to the SMTP server
 *
 * @param {Function} callback Callback function to run once the connection is established or failed
 */
PoolResource.prototype.connect = function (callback) {
    this.pool.getSocket(this.options, (err, socketOptions) => {
        if (err) {
            return callback(err);
        }

        let returned = false;
        let options = this.options;
        if (socketOptions && socketOptions.connection) {
            this.logger.info("Using proxied socket from %s:%s to %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort, options.host || "", options.port || "");
            options = assign(false, options);
            Object.keys(socketOptions).forEach((key) => {
                options[key] = socketOptions[key];
            });
        }

        this.connection = new SMTPConnection(options);

        this.connection.once("error", (err) => {
            this.emit("error", err);
            if (returned) {
                return;
            }
            returned = true;
            return callback(err);
        });

        this.connection.once("end", () => {
            this.close();
            if (returned) {
                return;
            }
            returned = true;
            return callback();
        });

        this.connection.connect(() => {
            if (returned) {
                return;
            }

            if (this.options.auth) {
                this.connection.login(this.options.auth, (err) => {
                    if (returned) {
                        return;
                    }
                    returned = true;

                    if (err) {
                        this.connection.close();
                        this.emit("error", err);
                        return callback(err);
                    }

                    this._connected = true;
                    callback(null, true);
                });
            } else {
                returned = true;
                this._connected = true;
                return callback(null, true);
            }
        });
    });
};

/**
 * Sends an e-mail to be sent using the selected settings
 *
 * @param {Object} mail Mail object
 * @param {Function} callback Callback function
 */
PoolResource.prototype.send = function (mail, callback) {
    if (!this._connected) {
        this.connect((err) => {
            if (err) {
                return callback(err);
            }
            this.send(mail, callback);
        });
        return;
    }

    const envelope = mail.message.getEnvelope();
    const messageId = (mail.message.getHeader("message-id") || "").replace(/[<>\s]/g, "");
    const recipients = [].concat(envelope.to || []);
    if (recipients.length > 3) {
        recipients.push(`...and ${recipients.splice(2).length} more`);
    }

    this.logger.info("Sending message <%s> using #%s to <%s>", messageId, this.id, recipients.join(", "));

    this.connection.send(envelope, mail.message.createReadStream(), (err, info) => {
        this.messages++;

        if (err) {
            this.connection.close();
            this.emit("error", err);
            return callback(err);
        }

        info.envelope = {
            from: envelope.from,
            to: envelope.to
        };
        info.messageId = messageId;

        setImmediate(() => {
            let err;
            if (this.messages >= this.options.maxMessages) {
                err = new Error("Resource exhausted");
                err.code = "EMAXLIMIT";
                this.connection.close();
                this.emit("error", err);
            } else {
                this.pool._checkRateLimit(() => {
                    this.available = true;
                    this.emit("available");
                });
            }
        });

        callback(null, info);
    });
};

/**
 * Closes the connection
 */
PoolResource.prototype.close = function () {
    this._connected = false;
    if (this.connection) {
        this.connection.close();
    }
    this.emit("close");
};
