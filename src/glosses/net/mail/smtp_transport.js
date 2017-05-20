
const packageData = require("../../../../package.json");
const SMTPConnection = adone.net.mail.smtpConnection;
const wellknown = adone.net.mail.wellknown;
const shared = adone.net.mail.shared;

// expose to the world
module.exports = function (options) {
    return new SMTPTransport(options);
};

/**
 * Creates a SMTP transport object for mailer
 *
 * @constructor
 * @param {Object} options Connection options
 */
function SMTPTransport(options) {
    adone.std.events.EventEmitter.call(this);

    options = options || {};
    if (typeof options === "string") {
        options = {
            url: options
        };
    }

    let urlData;
    let service = options.service;

    if (typeof options.getSocket === "function") {
        this.getSocket = options.getSocket;
    }

    if (options.url) {
        urlData = shared.parseConnectionUrl(options.url);
        service = service || urlData.service;
    }

    this.options = assign(
        false, // create new object
        options, // regular options
        urlData, // url options
        service && wellknown(service) // wellknown options
    );

    this.logger = shared.getLogger(this.options);

    // temporary object
    const connection = new SMTPConnection(this.options);

    this.name = "SMTP";
    this.version = `${packageData.version}[client:${connection.version}]`;
}
adone.std.util.inherits(SMTPTransport, adone.std.events.EventEmitter);

/**
 * Placeholder function for creating proxy sockets. This method immediatelly returns
 * without a socket
 *
 * @param {Object} options Connection options
 * @param {Function} callback Callback function to run with the socket keys
 */
SMTPTransport.prototype.getSocket = function (options, callback) {
    // return immediatelly
    return callback(null, false);
};

/**
 * Sends an e-mail using the selected settings
 *
 * @param {Object} mail Mail object
 * @param {Function} callback Callback function
 */
SMTPTransport.prototype.send = function (mail, callback) {

    this.getSocket(this.options, (err, socketOptions) => {
        if (err) {
            return callback(err);
        }

        let options = this.options;
        if (socketOptions && socketOptions.connection) {
            this.logger.info("Using proxied socket from %s:%s to %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort, options.host || "", options.port || "");
            // only copy options if we need to modify it
            options = assign(false, options);
            Object.keys(socketOptions).forEach((key) => {
                options[key] = socketOptions[key];
            });
        }

        const connection = new SMTPConnection(options);
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
            return callback(new Error("Connection closed"));
        });

        const sendMessage = function () {
            const envelope = mail.message.getEnvelope();
            const messageId = (mail.message.getHeader("message-id") || "").replace(/[<>\s]/g, "");
            const recipients = [].concat(envelope.to || []);
            if (recipients.length > 3) {
                recipients.push(`...and ${recipients.splice(2).length} more`);
            }

            this.logger.info("Sending message <%s> to <%s>", messageId, recipients.join(", "));

            connection.send(envelope, mail.message.createReadStream(), (err, info) => {
                if (returned) {
                    return;
                }
                returned = true;

                connection.close();
                if (err) {
                    return callback(err);
                }
                info.envelope = {
                    from: envelope.from,
                    to: envelope.to
                };
                info.messageId = messageId;
                return callback(null, info);
            });
        }.bind(this);

        connection.connect(() => {
            if (returned) {
                return;
            }

            if (this.options.auth) {
                connection.login(this.options.auth, (err) => {
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
};

/**
 * Verifies SMTP configuration
 *
 * @param {Function} callback Callback function
 */
SMTPTransport.prototype.verify = function (callback) {
    let promise;

    if (!callback && typeof Promise === "function") {
        promise = new Promise((resolve, reject) => {
            callback = shared.callbackPromise(resolve, reject);
        });
    }

    this.getSocket(this.options, (err, socketOptions) => {
        if (err) {
            return callback(err);
        }

        let options = this.options;
        if (socketOptions && socketOptions.connection) {
            this.logger.info("Using proxied socket from %s:%s", socketOptions.connection.remoteAddress, socketOptions.connection.remotePort);
            options = assign(false, options);
            Object.keys(socketOptions).forEach((key) => {
                options[key] = socketOptions[key];
            });
        }

        const connection = new SMTPConnection(options);
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
            return callback(new Error("Connection closed"));
        });

        const finalize = function () {
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

            if (this.options.auth) {
                connection.login(this.options.auth, (err) => {
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
};

/**
 * Copies properties from source objects to target objects
 */
function assign( /* target, ... sources */ ) {
    const args = Array.prototype.slice.call(arguments);
    const target = args.shift() || {};

    args.forEach((source) => {
        Object.keys(source || {}).forEach((key) => {
            if (["tls", "auth"].indexOf(key) >= 0 && source[key] && typeof source[key] === "object") {
                // tls and auth are special keys that need to be enumerated separately
                // other objects are passed as is
                if (!target[key]) {
                    // esnure that target has this key
                    target[key] = {};
                }
                Object.keys(source[key]).forEach((subKey) => {
                    target[key][subKey] = source[key][subKey];
                });
            } else {
                target[key] = source[key];
            }
        });
    });
    return target;
}
