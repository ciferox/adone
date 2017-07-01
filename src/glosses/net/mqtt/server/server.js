const { is } = adone;
const steed = require("steed")();
const ascoltatori = require("ascoltatori");
const pino = require("pino");
const extend = require("extend");
const shortid = require("shortid");
import Client from "./client";
import Stats from "./stats";
const persistence = require("./persistence");
import * as options from "./options";
import * as interfaces from "./interfaces";

const defaults = options.defaultsLegacy();

export default class Server extends adone.EventEmitter {
    constructor(opts, callback) {
        let modernOpts = options.modernize(opts);
        const validationResult = options.validate(modernOpts);

        if (validationResult.errors.length > 0) {
            const errMessage = validationResult.errors[0].message;
            if (callback) {
                callback(new Error(errMessage));
            } else {
                throw new Error(errMessage);
            }
        }

        modernOpts = options.populate(modernOpts);

        super();

        this.opts = extend(true, {}, defaults, opts);
        this.modernOpts = modernOpts;

        if (this.opts.secure) {
            this.opts.secure.port = this.opts.secure.port || 8883;
        }
        if (this.opts.http) {
            this.opts.http.port = this.opts.http.port || 3000;
        }
        if (this.opts.https) {
            this.opts.https.port = this.opts.https.port || 3001;
        }

        callback = callback || (() => { });

        this._dedupId = 0;
        this.clients = {};
        this.closed = false;

        if (this.modernOpts.logger.childOf) {
            this.logger = this.modernOpts.logger.childOf;
            delete this.modernOpts.logger.childOf;
            delete this.modernOpts.logger.name;
            this.logger = this.logger.child(this.modernOpts.logger);
        } else {
            this.logger = pino(this.modernOpts.logger);
        }

        if (this.modernOpts.stats) {
            new Stats().wire(this);
        }

        const that = this;

        // put QOS-2 spoofing as a variable direct on server
        this.onQoS2publish = this.modernOpts.onQoS2publish;

        // each Server has a dummy id for logging purposes
        this.id = this.modernOpts.id || shortid.generate();

        // initialize servers list
        this.servers = [];


        steed.series([

            // steed.series: wait for ascoltatore
            function (done) {

                if (that.modernOpts.ascoltatore) {
                    that.ascoltatore = that.modernOpts.ascoltatore;
                    done();
                } else {
                    that.ascoltatore = ascoltatori.build(that.modernOpts.backend, done);
                    that.ascoltatore.on("error", that.emit.bind(that, "error"));
                }
            },

            // steed.series: wait for persistence

            function (done) {
                // REFACTOR: partially move to options.validate and options.populate?
                let persistenceFactory = that.modernOpts.persistence && that.modernOpts.persistence.factory;
                if (persistenceFactory) {
                    if (is.string(persistenceFactory)) {
                        const factoryName = persistenceFactory;
                        persistenceFactory = persistence.getFactory(factoryName);
                        if (!persistenceFactory) {
                            return callback(new Error(`No persistence factory found for ${factoryName}`));
                        }
                    }

                    that.persistence = persistenceFactory(that.modernOpts.persistence, done);
                    that.persistence.wire(that);
                } else {
                    that.persistence = null;
                    done();
                }
            },

            // steed.series: iterate over defined interfaces, build servers and listen
            function (done) {

                steed.eachSeries(that.modernOpts.interfaces, (iface, dn) => {
                    const fallback = that.modernOpts;
                    const host = iface.host || that.modernOpts.host;
                    const port = iface.port || that.modernOpts.port;

                    const server = interfaces.serverFactory(iface, fallback, that);
                    that.servers.push(server);
                    server.maxConnections = iface.maxConnections || 10000000;
                    server.listen(port, host, dn);
                }, done);
            },

            // steed.series: log startup information
            function (done) {
                const logInfo = {};

                that.modernOpts.interfaces.forEach((iface) => {
                    let name = iface.type;
                    if (!is.string(name)) {
                        name = iface.type.name;
                    }
                    logInfo[name] = iface.port;
                });

                that.logger.info(logInfo, "server started");
                that.emit("ready");
                done(null);
            }
        ], (err, results) => {
            if (err) {
                callback(err);
            }
        });

        that.on("clientConnected", function (client) {
            if (that.modernOpts.publishNewClient) {
                that.publish({
                    topic: `$SYS/${that.id}/new/clients`,
                    payload: client.id
                });
            }

            this.clients[client.id] = client;
        });

        that.once("ready", () => {
            callback(null, that);
        });

        that.on("ready", () => {
            that.ascoltatore.subscribe(
                "$SYS/+/new/clients",
                (topic, payload) => {
                    const serverId = topic.split("/")[1];
                    const clientId = payload;

                    if (that.clients[clientId] && serverId !== that.id) {
                        that.clients[clientId].close(null, "new connection request");
                    }
                }
            );
        });

        if (that.modernOpts.publishSubscriptions) {
            that.on("subscribed", (topic, client) => {
                that.publish({
                    topic: `$SYS/${that.id}/new/subscribes`,
                    payload: JSON.stringify({
                        clientId: client.id,
                        topic
                    })
                });
            });

            that.on("unsubscribed", (topic, client) => {
                that.publish({
                    topic: `$SYS/${that.id}/new/unsubscribes`,
                    payload: JSON.stringify({
                        clientId: client.id,
                        topic
                    })
                });
            });
        }

        that.on("clientDisconnected", function (client) {
            if (that.modernOpts.publishClientDisconnect) {
                that.publish({
                    topic: `$SYS/${that.id}/disconnect/clients`,
                    payload: client.id
                });
            }
            delete this.clients[client.id];
        });
    }

    toString() {
        return "mosca.Server";
    }

    subscribe(topic, callback, done) {
        this.ascoltatore.subscribe(topic, callback, done);
    }

    publish(packet, client, callback) {
        const that = this;
        let logger = this.logger;

        if (is.function(client)) {
            callback = client;
            client = null;
        } else if (client) {
            logger = client.logger;
        }

        if (!callback) {
            callback = adone.noop;
        }

        const newPacket = {
            topic: packet.topic,
            payload: packet.payload,
            messageId: this.generateUniqueId(),
            qos: packet.qos,
            retain: packet.retain
        };

        const opts = {
            qos: packet.qos,
            messageId: newPacket.messageId
        };

        if (client) {
            opts.clientId = client.id;
        }

        that.storePacket(newPacket, () => {
            if (that.closed) {
                logger.debug({ packet: newPacket }, "not delivering because we are closed");
                return;
            }

            that.ascoltatore.publish(
                newPacket.topic,
                newPacket.payload,
                opts,
                () => {
                    that.published(newPacket, client, () => {
                        if (newPacket.topic.indexOf("$SYS") >= 0) {
                            logger.trace({ packet: newPacket }, "published packet");
                        } else {
                            logger.debug({ packet: newPacket }, "published packet");
                        }
                        that.emit("published", newPacket, client);
                        callback(undefined, newPacket);
                    });
                }
            );
        });
    }

    authenticate(client, username, password, callback) {
        callback(null, true);
    }

    published(packet, client, callback) {
        callback(null);
    }

    authorizePublish(client, topic, payload, callback) {
        callback(null, true);
    }

    authorizeSubscribe(client, topic, callback) {
        callback(null, true);
    }

    authorizeForward(client, packet, callback) {
        callback(null, true);
    }

    storePacket(packet, callback) {
        if (callback) {
            callback();
        }
    }

    deleteOfflinePacket(client, messageId, callback) {
        if (callback) {
            callback();
        }
    }

    forwardRetained(pattern, client, callback) {
        if (callback) {
            callback();
        }
    }

    restoreClientSubscriptions(client, callback) {
        if (callback) {
            callback();
        }
    }

    forwardOfflinePackets(client, callback) {
        if (callback) {
            callback();
        }
    }

    updateOfflinePacket(client, originMessageId, packet, callback) {
        if (callback) {
            callback(null, packet);
        }
    }

    persistClient(client, callback) {
        if (callback) {
            callback();
        }
    }

    close(callback) {
        const that = this;
        const stuffToClose = [];

        callback = callback || function nop() { };

        if (that.closed) {
            return callback();
        }

        that.closed = true;

        Object.keys(that.clients).forEach((i) => {
            stuffToClose.push(that.clients[i]);
        });

        that.servers.forEach((server) => {
            stuffToClose.push(server);
        });

        if (that.persistence) {
            stuffToClose.push(that.persistence);
        }

        steed.each(stuffToClose, (toClose, cb) => {
            toClose.close(cb, "server closed");
        }, () => {
            that.ascoltatore.close(() => {
                that.logger.info("server closed");
                that.emit("closed");
                callback();
            });
        });
    }

    attachHttpServer(server, path) {
        const that = this;

        const opt = { server };
        if (path) {
            opt.path = path;
        }

        adone.net.ws.stream.createServer(opt, (stream) => {
            const conn = new adone.net.mqtt.connection.Connection(stream);
            new Client(conn, that);
        });
    }

    nextDedupId() {
        return this._dedupId++;
    }

    generateUniqueId() {
        return shortid.generate();
    }
}
