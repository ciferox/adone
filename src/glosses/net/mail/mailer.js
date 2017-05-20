
const packageData = require("../../../../package.json");
const mailcomposer = adone.net.mail.composer;
const directTransport = adone.net.mail.directTransport;
const smtpTransport = adone.net.mail.smtpTransport;
const smtpPoolTransport = adone.net.mail.smtpPool;
const templateSender = adone.net.mail.templateSender;
const httpProxy = adone.net.mail.httpProxy;
const shared = adone.net.mail.shared;
const Socks = adone.net.proxy.socks;

// Export createTransport method
module.exports.createTransport = function (transporter, defaults) {
    let urlConfig;
    let options;
    let mailer;
    let proxyUrl;

    // if no transporter configuration is provided use direct as default
    transporter = transporter || directTransport({
        debug: true
    });

    if (
        // provided transporter is a configuration object, not transporter plugin
        (typeof transporter === "object" && typeof transporter.send !== "function") ||
        // provided transporter looks like a connection url
        (typeof transporter === "string" && /^(smtps?|direct):/i.test(transporter))
    ) {

        if ((urlConfig = typeof transporter === "string" ? transporter : transporter.url)) {
            // parse a configuration URL into configuration options
            options = shared.parseConnectionUrl(urlConfig);
        } else {
            options = transporter;
        }

        if (options.proxy && typeof options.proxy === "string") {
            proxyUrl = options.proxy;
        }

        if (options.transport && typeof options.transport === "string") {
            try {
                transporter = adone.net.mail[`${options.transport.toLowerCase()}Transport`](options);
            } catch (err) {
                // if transporter loader fails, return an error when sending mail
                transporter = {
                    send(mail, callback) {
                        const errmsg = `Requested transport plugin  "${(options.transport).toLowerCase()}Transport" could not be initiated`;
                        const err = new Error(errmsg);
                        err.code = "EINIT";
                        setImmediate(() => {
                            return callback(err);
                        });
                    }
                };
            }
        } else if (options.direct) {
            transporter = directTransport(options);
        } else if (options.pool) {
            transporter = smtpPoolTransport(options);
        } else {
            transporter = smtpTransport(options);
        }
    }

    mailer = new Mailer(transporter, options, defaults);

    if (proxyUrl) {
        setupProxy(mailer, proxyUrl);
    }

    return mailer;
};

/**
 * Sets up proxy handler for a Mailer object
 *
 * @param {Object} mailer Mailer instance to modify
 * @param {String} proxyUrl Proxy configuration url
 */
function setupProxy(mailer, proxyUrl) {
    const proxy = adone.std.url.parse(proxyUrl);

    // setup socket handler for the mailer object
    mailer.getSocket = function (options, callback) {
        switch (proxy.protocol) {

            // Connect using a HTTP CONNECT method
            case "http:":
            case "https:":
                httpProxy(proxy.href, options.port, options.host, (err, socket) => {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, {
                        connection: socket
                    });
                });
                return;

                // Connect using a SOCKS4/5 proxy
            case "socks:":
            case "socks5:":
            case "socks4:":
            case "socks4a:":
                Socks.createConnection({
                    proxy: {
                        ipaddress: proxy.hostname,
                        port: proxy.port,
                        type: Number(proxy.protocol.replace(/\D/g, "")) || 5
                    },
                    target: {
                        host: options.host,
                        port: options.port
                    },
                    command: "connect",
                    authentication: !proxy.auth ? false : {
                        username: decodeURIComponent(proxy.auth.split(":").shift()),
                        password: decodeURIComponent(proxy.auth.split(":").pop())
                    }
                }, (err, socket) => {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, {
                        connection: socket
                    });
                });
                return;
        }

        callback(new Error("Unknown proxy configuration"));
    };
}

/**
 * Creates an object for exposing the Mailer API
 *
 * @constructor
 * @param {Object} transporter Transport object instance to pass the mails to
 */
function Mailer(transporter, options, defaults) {
    adone.std.events.EventEmitter.call(this);

    this._options = options || {};

    this._defaults = defaults || {};

    this._plugins = {
        compile: [],
        stream: []
    };

    this.transporter = transporter;
    this.logger = this.transporter.logger || shared.getLogger({
        logger: false
    });

    // setup emit handlers for the transporter
    if (typeof transporter.on === "function") {

        // deprecated log interface
        this.transporter.on("log", (log) => {
            this.logger.debug("%s: %s", log.type, log.message);
        });

        // transporter errors
        this.transporter.on("error", (err) => {
            this.logger.error("Transport Error: %s", err.message);
            this.emit("error", err);
        });

        // indicates if the sender has became idle
        this.transporter.on("idle", function () {
            const args = Array.prototype.slice.call(arguments);
            args.unshift("idle");
            this.emit.apply(this, args);
        }.bind(this));
    }
}
adone.std.util.inherits(Mailer, adone.std.events.EventEmitter);

/**
 * Creates a template based sender function
 *
 * @param {Object} templates Object with string values where key is a message field and value is a template
 * @param {Object} defaults Optional default message fields
 * @return {Function} E-mail sender
 */
Mailer.prototype.templateSender = function (templates, defaults) {
    return templateSender(this, templates, defaults);
};

Mailer.prototype.use = function (step, plugin) {
    step = (step || "").toString();
    if (!this._plugins.hasOwnProperty(step)) {
        this._plugins[step] = [plugin];
    } else {
        this._plugins[step].push(plugin);
    }
};

/**
 * Optional methods passed to the underlying transport object
 */
["close", "isIdle", "verify"].forEach((method) => {
    Mailer.prototype[method] = function ( /* possible arguments */ ) {
        const args = Array.prototype.slice.call(arguments);
        if (typeof this.transporter[method] === "function") {
            return this.transporter[method].apply(this.transporter, args);
        } 
        return false;
        
    };
});

/**
 * Sends an email using the preselected transport object
 *
 * @param {Object} data E-data description
 * @param {Function} callback Callback to run once the sending succeeded or failed
 */
Mailer.prototype.sendMail = function (data, callback) {
    let promise;

    if (!callback && typeof Promise === "function") {
        promise = new Promise((resolve, reject) => {
            callback = shared.callbackPromise(resolve, reject);
        });
    }

    if (typeof this.getSocket === "function") {
        this.transporter.getSocket = this.getSocket.bind(this);
        this.getSocket = false;
    }

    data = data || {};
    data.headers = data.headers || {};
    callback = callback || function () {};

    // apply defaults
    Object.keys(this._defaults).forEach((key) => {
        if (!(key in data)) {
            data[key] = this._defaults[key];
        } else if (key === "headers") {
            // headers is a special case. Allow setting individual default headers
            Object.keys(this._defaults.headers || {}).forEach((key) => {
                if (!(key in data.headers)) {
                    data.headers[key] = this._defaults.headers[key];
                }
            });
        }
    });

    // force specific keys from transporter options
    ["disableFileAccess", "disableUrlAccess"].forEach((key) => {
        if (key in this._options) {
            data[key] = this._options[key];
        }
    });

    const mail = {
        data,
        message: null,
        resolveContent: shared.resolveContent
    };

    if (typeof this.transporter === "string") {
        callback(new Error("Unsupported configuration, downgrade Mailer to v0.7.1 to use it"));
        return promise;
    }

    this.logger.info("Sending mail using %s/%s", this.transporter.name, this.transporter.version);

    this._processPlugins("compile", mail, (err) => {
        if (err) {
            this.logger.error("PluginCompile Error: %s", err.message);
            return callback(err);
        }

        mail.message = mailcomposer(mail.data);

        if (mail.data.xMailer !== false) {
            mail.message.setHeader("X-Mailer", mail.data.xMailer || this._getVersionString());
        }

        if (mail.data.priority) {
            switch ((mail.data.priority || "").toString().toLowerCase()) {
                case "high":
                    mail.message.setHeader("X-Priority", "1 (Highest)");
                    mail.message.setHeader("X-MSMail-Priority", "High");
                    mail.message.setHeader("Importance", "High");
                    break;
                case "low":
                    mail.message.setHeader("X-Priority", "5 (Lowest)");
                    mail.message.setHeader("X-MSMail-Priority", "Low");
                    mail.message.setHeader("Importance", "Low");
                    break;
                default:
                    // do not add anything, since all messages are 'Normal' by default
            }
        }

        // add optional List-* headers
        if (mail.data.list && typeof mail.data.list === "object") {
            this._getListHeaders(mail.data.list).forEach((listHeader) => {
                listHeader.value.forEach((value) => {
                    mail.message.addHeader(listHeader.key, value);
                });
            });
        }

        this._processPlugins("stream", mail, (err) => {
            if (err) {
                this.logger.error("PluginStream Error: %s", err.message);
                return callback(err);
            }

            this.transporter.send(mail, function () {
                const args = Array.prototype.slice.call(arguments);
                if (args[0]) {
                    this.logger.error("Send Error: %s", args[0].message);
                }
                callback.apply(null, args);
            }.bind(this));
        });
    });

    return promise;
};

Mailer.prototype._getVersionString = function () {
    return adone.std.util.format(
        "%s (%s; +%s; %s/%s)",
        packageData.name,
        packageData.version,
        packageData.homepage,
        this.transporter.name,
        this.transporter.version
    );
};

Mailer.prototype._processPlugins = function (step, mail, callback) {
    step = (step || "").toString();

    if (!this._plugins.hasOwnProperty(step) || !this._plugins[step].length) {
        return callback(null);
    }

    const plugins = Array.prototype.slice.call(this._plugins[step]);

    this.logger.debug("Using %s plugins for %s", plugins.length, step);

    var processPlugins = function () {
        if (!plugins.length) {
            return callback(null);
        }
        const plugin = plugins.shift();
        plugin(mail, (err) => {
            if (err) {
                return callback(err);
            }
            processPlugins();
        });
    };

    processPlugins();
};

/**
 * This method takes list headers structure and converts it into
 * header list with key-value pairs
 *
 * @param {Object} listData Structured List-* headers
 * @return {Array} An array of headers
 */
Mailer.prototype._getListHeaders = function (listData) {
    // make sure an url looks like <protocol:url>
    const formatListUrl = function (url) {
        url = url.replace(/[\s<]+|[\s>]+/g, "");
        if (/^(https?|mailto|ftp):/.test(url)) {
            return `<${url}>`;
        }
        if (/^[^@]+@[^@]+$/.test(url)) {
            return `<mailto:${url}>`;
        }

        return `<http://${url}>`;
    };

    return Object.keys(listData).map((key) => {
        return {
            key: `list-${key.toLowerCase().trim()}`,
            value: [].concat(listData[key] || []).map((value) => {
                if (typeof value === "string") {
                    return formatListUrl(value);
                }
                return {
                    prepared: true,
                    value: [].concat(value || []).map((value) => {
                        if (typeof value === "string") {
                            return formatListUrl(value);
                        }
                        if (value && value.url) {
                            return formatListUrl(value.url) + (value.comment ? ` (${value.comment})` : "");
                        }
                        return "";
                    }).join(", ")
                };
            })
        };
    });
};
