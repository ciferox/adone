const {
    is,
    error,
    event,
    net: { mail: { __ } },
    std: { util, url: urllib, net, dns, crypto }
} = adone;

/**
 * Creates an object for exposing the Mail API
 */
export default class Mail extends event.Emitter {
    constructor(transporter, options = {}, defaults = {}) {
        super();

        this.options = options;
        this._defaults = defaults;

        this._defaultPlugins = {
            compile: [(...args) => this._convertDataImages(...args)],
            stream: []
        };

        this._userPlugins = {
            compile: [],
            stream: []
        };

        this.meta = new Map();

        this.dkim = this.options.dkim ? new __.dkim.DKIM(this.options.dkim) : false;

        this.transporter = transporter;
        this.transporter.mailer = this;

        this.logger = __.shared.getLogger(this.options, {
            component: this.options.component || "mail"
        });

        this.logger.debug({
            tnx: "create"
        }, "Creating transport: %s", this.getVersionString());

        // setup emit handlers for the transporter
        if (is.function(transporter.on)) {

            // deprecated log interface
            this.transporter.on("log", (log) => {
                this.logger.debug({
                    tnx: "transport"
                }, "%s: %s", log.type, log.message);
            });

            // transporter errors
            this.transporter.on("error", (err) => {
                this.logger.error({
                    err,
                    tnx: "transport"
                }, "Transport Error: %s", err.message);
                this.emit("error", err);
            });

            // indicates if the sender has became idle
            this.transporter.on("idle", (...args) => {
                this.emit("idle", ...args);
            });
        }

        /**
         * Optional methods passed to the underlying transport object
         */
        ["close", "isIdle", "verify"].forEach((method) => {
            this[method] = (...args) => {
                if (is.function(this.transporter[method])) {
                    return this.transporter[method](...args);
                }
                this.logger.warn({
                    tnx: "transport",
                    methodName: method
                }, "Non existing method %s called for transport", method);
                return false;

            };
        });

        // setup proxy handling
        if (this.options.proxy && is.string(this.options.proxy)) {
            this.setupProxy(this.options.proxy);
        }
    }

    use(step, plugin) {
        step = (step || "").toString();
        if (!this._userPlugins.hasOwnProperty(step)) {
            this._userPlugins[step] = [plugin];
        } else {
            this._userPlugins[step].push(plugin);
        }
    }

    /**
     * Sends an email using the preselected transport object
     */
    sendMail(data, callback) {
        let promise;

        if (!callback) {
            promise = new Promise((resolve, reject) => {
                callback = __.shared.callbackPromise(resolve, reject);
            });
        }

        if (is.function(this.getSocket)) {
            this.transporter.getSocket = this.getSocket;
            this.getSocket = false;
        }

        const mail = new __.MailMessage(this, data);

        this.logger.debug({
            tnx: "transport",
            name: this.transporter.name,
            version: this.transporter.version,
            action: "send"
        }, "Sending mail using %s/%s", this.transporter.name, this.transporter.version);

        this._processPlugins("compile", mail, (err) => {
            if (err) {
                this.logger.error({
                    err,
                    tnx: "plugin",
                    action: "compile"
                }, "PluginCompile Error: %s", err.message);
                return callback(err);
            }

            mail.message = new __.MailComposer(mail.data).compile();

            mail.setMailerHeader();
            mail.setPriorityHeaders();
            mail.setListHeaders();

            this._processPlugins("stream", mail, (err) => {
                if (err) {
                    this.logger.error({
                        err,
                        tnx: "plugin",
                        action: "stream"
                    }, "PluginStream Error: %s", err.message);
                    return callback(err);
                }

                if (mail.data.dkim || this.dkim) {
                    mail.message.processFunc((input) => {
                        const dkim = mail.data.dkim ? new __.dkim.DKIM(mail.data.dkim) : this.dkim;
                        this.logger.debug({
                            tnx: "DKIM",
                            messageId: mail.message.messageId(),
                            dkimDomains: dkim.keys.map((key) => `${key.keySelector}.${key.domainName}`).join(", ")
                        }, "Signing outgoing message with %s keys", dkim.keys.length);
                        return dkim.sign(input, mail.data._dkim);
                    });
                }

                this.transporter.send(mail, (...args) => {
                    if (args[0]) {
                        this.logger.error({
                            err: args[0],
                            tnx: "transport",
                            action: "send"
                        }, "Send Error: %s", args[0].message);
                    }
                    callback(...args);
                });
            });
        });

        return promise;
    }

    getVersionString() {
        return util.format(
            "%s (%s; +%s; %s/%s)",
            "adone/mail", //
            "x.x.x", // TODO: adone version ?
            "x", // TODO: adone homepage ?
            this.transporter.name,
            this.transporter.version
        );
    }

    _processPlugins(step, mail, callback) {
        step = (step || "").toString();

        if (!this._userPlugins.hasOwnProperty(step)) {
            return callback();
        }

        const userPlugins = this._userPlugins[step] || [];
        const defaultPlugins = this._defaultPlugins[step] || [];

        if (userPlugins.length) {
            this.logger.debug({
                tnx: "transaction",
                pluginCount: userPlugins.length,
                step
            }, "Using %s plugins for %s", userPlugins.length, step);
        }

        if (userPlugins.length + defaultPlugins.length === 0) {
            return callback();
        }

        let pos = 0;
        let block = "default";
        const processPlugins = () => {
            let curplugins = block === "default" ? defaultPlugins : userPlugins;
            if (pos >= curplugins.length) {
                if (block === "default" && userPlugins.length) {
                    block = "user";
                    pos = 0;
                    curplugins = userPlugins;
                } else {
                    return callback();
                }
            }
            const plugin = curplugins[pos++];
            plugin(mail, (err) => {
                if (err) {
                    return callback(err);
                }
                processPlugins();
            });
        };

        processPlugins();
    }

    /**
     * Sets up proxy handler
     */
    setupProxy(proxyUrl) {
        const proxy = urllib.parse(proxyUrl);

        // setup socket handler for the mailer object
        this.getSocket = (options, callback) => {
            const protocol = proxy.protocol.replace(/:$/, "").toLowerCase();

            if (this.meta.has(`proxy_handler_${protocol}`)) {
                return this.meta.get(`proxy_handler_${protocol}`)(proxy, options, callback);
            }

            switch (protocol) {
                // Connect using a HTTP CONNECT method
                case "http":
                case "https": {
                    adone.net.proxy.http.createSocket(proxy.href, options.port, options.host).then((connection) => {
                        callback(null, { connection });
                    }, callback);
                    return;
                }
                case "socks":
                case "socks5":
                case "socks4":
                case "socks4a": {
                    if (!this.meta.has("proxy_socks_module")) {
                        return callback(new error.IllegalStateException("Socks module not loaded"));
                    }

                    const connect = (ipaddress) => {
                        this.meta.get("proxy_socks_module").createConnection({
                            proxy: {
                                ipaddress,
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
                    };

                    if (net.isIP(proxy.hostname)) {
                        return connect(proxy.hostname);
                    }

                    return dns.resolve(proxy.hostname, (err, address) => {
                        if (err) {
                            return callback(err);
                        }
                        connect(address);
                    });
                }
            }
            callback(new error.UnknownException("Unknown proxy configuration"));
        };
    }

    _convertDataImages(mail, callback) {
        if (!this.options.attachDataUrls && !mail.data.attachDataUrls || !mail.data.html) {
            return callback();
        }
        mail.resolveContent(mail.data, "html", (err, html) => {
            if (err) {
                return callback(err);
            }
            let cidCounter = 0;
            html = (html || "").toString().replace(/(<img\b[^>]* src\s*=[\s"']*)(data:([^;]+);[^"'>\s]+)/gi, (match, prefix, dataUri, mimeType) => {
                const cid = `${crypto.randomBytes(10).toString("hex")}@localhost`;
                if (!mail.data.attachments) {
                    mail.data.attachments = [];
                }
                if (!is.array(mail.data.attachments)) {
                    mail.data.attachments = util.arrify(mail.data.attachments || []);
                }
                mail.data.attachments.push({
                    path: dataUri,
                    cid,
                    filename: `image-${++cidCounter}.${__.mimeTypes.detectExtension(mimeType)}`
                });
                return `${prefix}cid:${cid}`;
            });
            mail.data.html = html;
            callback();
        });
    }

    set(key, value) {
        return this.meta.set(key, value);
    }

    get(key) {
        return this.meta.get(key);
    }
}
