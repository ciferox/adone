const {
    x,
    event: { EventEmitter },
    util,
    net: { mail: { __ } }
} = adone;

/**
 * Creates an element for the pool
 *
 * @constructor
 * @param {Object} options SMTPPool instance
 */
export default class PoolResource extends EventEmitter {
    constructor(pool) {
        super();

        this.pool = pool;
        this.options = pool.options;
        this.logger = this.pool.logger;

        if (this.options.auth) {
            switch ((this.options.auth.type || "").toString().toUpperCase()) {
                case "OAUTH2": {
                    const oauth2 = new __.XOAuth2(this.options.auth, this.logger);
                    oauth2.provisionCallback = this.pool.mailer && this.pool.mailer.get("oauth2_provision_cb") || oauth2.provisionCallback;
                    this.auth = {
                        type: "OAUTH2",
                        user: this.options.auth.user,
                        oauth2,
                        method: "XOAUTH2"
                    };
                    oauth2.on("token", (token) => this.pool.mailer.emit("token", token));
                    oauth2.on("error", (err) => this.emit("error", err));
                    break;
                }
                default:
                    this.auth = {
                        type: "LOGIN",
                        user: this.options.auth.user,
                        credentials: {
                            user: this.options.auth.user || "",
                            pass: this.options.auth.pass
                        },
                        method: (this.options.auth.method || "").trim().toUpperCase() || false
                    };
            }
        }

        this._connection = false;
        this._connected = false;

        this.messages = 0;
        this.available = true;
    }

    /**
     * Initiates a connection to the SMTP server
     *
     * @param {Function} callback Callback function to run once the connection is established or failed
     */
    connect(callback) {
        this.pool.getSocket(this.options, (err, socketOptions) => {
            if (err) {
                return callback(err);
            }

            let returned = false;
            let options = this.options;
            if (socketOptions && socketOptions.connection) {
                this.logger.info({
                    tnx: "proxy",
                    remoteAddress: socketOptions.connection.remoteAddress,
                    remotePort: socketOptions.connection.remotePort,
                    destHost: options.host || "",
                    destPort: options.port || "",
                    action: "connected"
                }, "Using proxied socket from %s:%s to %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort, options.host || "", options.port || "");

                options = Object.assign(__.shared.assign(false, options), socketOptions);
            }

            this.connection = new __.SMTPConnection(options);

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
                setTimeout(() => {
                    if (returned) {
                        return;
                    }
                    // still have not returned, this means we have an unexpected connection close
                    const err = new x.IllegalState("Unexpected socket close");
                    if (this.connection && this.connection._socket && this.connection._socket.upgrading) {
                        // starttls connection errors
                        err.code = "ETLS";
                    }
                    callback(err);
                }, 1000).unref();
            });

            this.connection.connect(() => {
                if (returned) {
                    return;
                }

                if (this.auth) {
                    this.connection.login(this.auth, (err) => {
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
    }

    /**
     * Sends an e-mail to be sent using the selected settings
     *
     * @param {Object} mail Mail object
     * @param {Function} callback Callback function
     */
    send(mail, callback) {
        if (!this._connected) {
            return this.connect((err) => {
                if (err) {
                    return callback(err);
                }
                return this.send(mail, callback);
            });
        }

        const envelope = mail.message.getEnvelope();
        const messageId = mail.message.messageId();

        const recipients = util.arrify(envelope.to || []);
        if (recipients.length > 3) {
            recipients.push(`...and ${recipients.splice(2).length} more`);
        }
        this.logger.info({
            tnx: "send",
            messageId,
            cid: this.id
        }, "Sending message %s using #%s to <%s>", messageId, this.id, recipients.join(", "));

        if (mail.data.dsn) {
            envelope.dsn = mail.data.dsn;
        }

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
                    err = new x.IllegalState("Resource exhausted");
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
    }

    /**
     * Closes the connection
     */
    close() {
        this._connected = false;
        if (this.auth && this.auth.oauth2) {
            this.auth.oauth2.removeAllListeners();
        }
        if (this.connection) {
            this.connection.close();
        }
        this.emit("close");
    }
}
