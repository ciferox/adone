const {
    is,
    error,
    event,
    util,
    net: { mail: { __ } }
} = adone;

/**
 * Creates a SMTP transport object for Nodemailer
 *
 * @constructor
 * @param {Object} options Connection options
 */
export default class SMTPTransport extends event.Emitter {
    constructor(options) {
        super();

        options = options || {};
        if (is.string(options)) {
            options = {
                url: options
            };
        }

        let urlData;
        let service = options.service;

        if (is.function(options.getSocket)) {
            this.getSocket = options.getSocket;
        }

        if (options.url) {
            urlData = __.shared.parseConnectionUrl(options.url);
            service = service || urlData.service;
        }

        this.options = __.shared.assign(
            false, // create new object
            options, // regular options
            urlData, // url options
            service && __.wellKnown(service) // wellknown options
        );

        this.logger = __.shared.getLogger(this.options, {
            component: this.options.component || "smtp-transport"
        });

        // temporary object
        const connection = new __.SMTPConnection(this.options);

        this.name = "SMTP";
        // this.version = packageData.version + '[client:' + connection.version + ']';
        this.version = `${"x.x.x" + "[client:"}${connection.version}]`;

        if (this.options.auth) {
            this.auth = this.getAuth({});
        }
    }

    /**
     * Placeholder function for creating proxy sockets. This method immediatelly returns
     * without a socket
     *
     * @param {Object} options Connection options
     * @param {Function} callback Callback function to run with the socket keys
     */
    getSocket(options, callback) {
        // return immediatelly
        return setImmediate(() => callback(null, false));
    }

    getAuth(authOpts) {
        if (!authOpts) {
            return this.auth;
        }

        let hasAuth = false;
        const authData = {};

        if (this.options.auth && is.object(this.options.auth)) {
            Object.keys(this.options.auth).forEach((key) => {
                hasAuth = true;
                authData[key] = this.options.auth[key];
            });
        }

        if (authOpts && is.object(authOpts)) {
            Object.keys(authOpts).forEach((key) => {
                hasAuth = true;
                authData[key] = authOpts[key];
            });
        }

        if (!hasAuth) {
            return false;
        }

        switch ((authData.type || "").toString().toUpperCase()) {
            case "OAUTH2": {
                if (!authData.service && !authData.user) {
                    return false;
                }
                const oauth2 = new __.XOAuth2(authData, this.logger);
                oauth2.provisionCallback = this.mailer && this.mailer.get("oauth2_provision_cb") || oauth2.provisionCallback;
                oauth2.on("token", (token) => this.mailer.emit("token", token));
                oauth2.on("error", (err) => this.emit("error", err));
                return {
                    type: "OAUTH2",
                    user: authData.user,
                    oauth2,
                    method: "XOAUTH2"
                };
            }
            default: {
                return {
                    type: "LOGIN",
                    user: authData.user,
                    credentials: {
                        user: authData.user || "",
                        pass: authData.pass
                    },
                    method: (authData.method || "").trim().toUpperCase() || false
                };
            }
        }
    }

    /**
     * Sends an e-mail using the selected settings
     *
     * @param {Object} mail Mail object
     * @param {Function} callback Callback function
     */
    send(mail, callback) {
        this.getSocket(this.options, (err, socketOptions) => {
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

                // only copy options if we need to modify it
                options = Object.assign(__.shared.assign(false, options), socketOptions);
            }

            const connection = new __.SMTPConnection(options);

            connection.once("error", (err) => {
                if (returned) {
                    return;
                }
                returned = true;
                connection.close();
                return callback(err);
            });

            connection.once("end", () => {
                if (returned) {
                    return;
                }
                const timer = setTimeout(() => {
                    if (returned) {
                        return;
                    }
                    returned = true;
                    // still have not returned, this means we have an unexpected connection close
                    const err = new error.IllegalState("Unexpected socket close");
                    if (connection && connection._socket && connection._socket.upgrading) {
                        // starttls connection errors
                        err.code = "ETLS";
                    }
                    callback(err);
                }, 1000);

                try {
                    timer.unref();
                } catch (E) {
                    // Ignore. Happens on envs with non-node timer implementation
                }
            });

            const sendMessage = () => {
                const envelope = mail.message.getEnvelope();
                const messageId = mail.message.messageId();

                const recipients = util.arrify(envelope.to || []);
                if (recipients.length > 3) {
                    recipients.push(`...and ${recipients.splice(2).length} more`);
                }

                if (mail.data.dsn) {
                    envelope.dsn = mail.data.dsn;
                }

                this.logger.info({
                    tnx: "send",
                    messageId
                }, "Sending message %s to <%s>", messageId, recipients.join(", "));

                connection.send(envelope, mail.message.createReadStream(), (err, info) => {
                    returned = true;
                    connection.close();
                    if (err) {
                        this.logger.error({
                            err,
                            tnx: "send"
                        }, "Send error for %s: %s", messageId, err.message);
                        return callback(err);
                    }
                    info.envelope = {
                        from: envelope.from,
                        to: envelope.to
                    };
                    info.messageId = messageId;
                    try {
                        return callback(null, info);
                    } catch (E) {
                        this.logger.error({
                            err: E,
                            tnx: "callback"
                        }, "Callback error for %s: %s", messageId, E.message);
                    }
                });
            };

            connection.connect(() => {
                if (returned) {
                    return;
                }

                const auth = this.getAuth(mail.data.auth);

                if (auth) {
                    connection.login(auth, (err) => {
                        if (auth && auth !== this.auth && auth.oauth2) {
                            auth.oauth2.removeAllListeners();
                        }
                        if (returned) {
                            return;
                        }

                        if (err) {
                            returned = true;
                            connection.close();
                            return callback(err);
                        }

                        sendMessage();
                    });
                } else {
                    sendMessage();
                }
            });
        });
    }

    /**
     * Verifies SMTP configuration
     *
     * @param {Function} callback Callback function
     */
    verify(callback) {
        let promise;

        if (!callback) {
            promise = new Promise((resolve, reject) => {
                callback = __.shared.callbackPromise(resolve, reject);
            });
        }

        this.getSocket(this.options, (err, socketOptions) => {
            if (err) {
                return callback(err);
            }

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

            const connection = new __.SMTPConnection(options);
            let returned = false;

            connection.once("error", (err) => {
                if (returned) {
                    return;
                }
                returned = true;
                connection.close();
                return callback(err);
            });

            connection.once("end", () => {
                if (returned) {
                    return;
                }
                returned = true;
                return callback(new error.IllegalState("Connection closed"));
            });

            const finalize = () => {
                if (returned) {
                    return;
                }
                returned = true;
                connection.quit();
                return callback(null, true);
            };

            connection.connect(() => {
                if (returned) {
                    return;
                }

                const authData = this.getAuth({});

                if (authData) {
                    connection.login(authData, (err) => {
                        if (returned) {
                            return;
                        }

                        if (err) {
                            returned = true;
                            connection.close();
                            return callback(err);
                        }

                        finalize();
                    });
                } else {
                    finalize();
                }
            });
        });

        return promise;
    }

    /**
     * Releases resources
     */
    close() {
        if (this.auth && this.auth.oauth2) {
            this.auth.oauth2.removeAllListeners();
        }
        this.emit("close");
    }
}
