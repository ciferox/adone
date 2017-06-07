const steed = require("steed")();
const uuid = require("uuid");
const retimer = require("retimer");

function nop() { }

// Calculate the QoS of the subscriptions.
function calculateGranted(client, packet) {
    return packet.subscriptions.map((e) => {
        if (e.qos === 2) {
            e.qos = 1;
        }
        if (client.subscriptions[e.topic] !== undefined) {
            client.subscriptions[e.topic].qos = e.qos;
        }
        return e.qos;
    });
}

function handleEachSub(s, cb) {
    /*jshint validthis:true */
    const that = this;
    if (this.subscriptions[s.topic] === undefined) {
        this.server.authorizeSubscribe(that, s.topic, (err, success) => {
            that.handleAuthorizeSubscribe(err, success, s, cb);
        });
    } else {
        cb(null, true);
    }
}

export default class Client {
    constructor(conn, server) {
        this.connection = conn;
        this.server = server;
        this.logger = server.logger;
        this.subscriptions = {};

        this.nextId = 1;
        this.inflight = {};
        this.inflightCounter = 0;
        this._lastDedupId = -1;
        this._closed = false;
        this._closing = false;

        this._setup();
    }

    _setup() {
        let that = this, client = that.connection;

        this._buildForward();

        client.on("error", nop);

        function completeConnection() {
            that.setUpTimer();

            that.server.restoreClientSubscriptions(that, (session_present) => {
                client.connack({
                    returnCode: 0,
                    // maybe session_present is null, custom old persistence engine
                    // or not persistence defined
                    sessionPresent: session_present ? true : false
                });

                that.logger.info("client connected");
                that.server.emit("clientConnected", that);

                // packets will be forward only if client.clean is false
                that.server.forwardOfflinePackets(that);
            });

            client.on("puback", (packet) => {
                that.setUpTimer();
                that.handlePuback(packet);
            });

            client.on("pingreq", () => {
                that.logger.debug("pingreq");
                that.setUpTimer();
                that.handlePingreq();
                that.connection.pingresp();
            });

            client.on("subscribe", (packet) => {
                that.setUpTimer();
                that.handleSubscribe(packet);
            });

            client.on("publish", (packet) => {
                that.setUpTimer();
                that.server.authorizePublish(that, packet.topic, packet.payload, (err, success) => {
                    that.handleAuthorizePublish(err, success, packet);
                });
            });

            client.on("unsubscribe", (packet) => {
                that.setUpTimer();
                that.logger.info({ packet }, "unsubscribe received");
                steed.map(that, packet.unsubscriptions, that.unsubscribeMapTo, (err) => {
                    if (err) {
                        that.logger.warn(err);
                        that.close(null, err.message);
                        return;
                    }
                    that.server.persistClient(that);
                    client.unsuback({
                        messageId: packet.messageId
                    });
                });
            });

            client.on("disconnect", () => {
                that.logger.debug("disconnect requested");
                that.close(null, "disconnect request");
            });

            function handleError(err) {
                that.server.emit("clientError", err, that);
                that.onNonDisconnectClose(err.message);
            }

            client.on("error", handleError);
            client.removeListener("error", nop);

            client.on("close", () => {
                that.onNonDisconnectClose("close");
            });
        }

        client.once("connect", (packet) => {
            that.handleConnect(packet, completeConnection);
        });
    }

    setUpTimer() {
        if (this.keepalive <= 0) {
            return;
        }

        const timeout = this.keepalive * 1000 * 3 / 2;
        const that = this;

        this.logger.debug({ timeout }, "setting keepalive timeout");

        if (this.timer) {
            this.timer.reschedule(timeout);
        } else {
            this.timer = retimer(function keepaliveTimeout() {
                that.logger.info("keepalive timeout");
                that.onNonDisconnectClose("keepalive timeout");
            }, timeout);
        }
    }

    _buildForward() {
        const that = this;

        function doForward(err, packet) {
            if (err) {
                return that.client && that.client.emit("error", err);
            }

            that.server.authorizeForward(that, packet, (err, authorized) => {
                if (err) {
                    return that.client && that.client.emit("error", err);
                }

                if (!authorized) {
                    that.logger.warn(packet, "Unauthorized Forward");
                    return;
                }

                that.connection.publish(packet);

                if (packet.qos === 1) {
                    that.inflight[packet.messageId] = packet;
                }
            });
        }

        this.forward = function (topic, payload, options, subTopic, qos, cb) {
            if (options._dedupId <= that._lastDedupId) {
                return;
            }

            that.logger.trace({ topic }, "delivering message");

            let sub = that.subscriptions[subTopic],
                indexWildcard = subTopic.indexOf("#"),
                indexPlus = subTopic.indexOf("+"),
                forward = true,
                newId = this.nextId++;

            // Make sure 'nextId' always fits in a uint8 (http://git.io/vmgKI).
            this.nextId %= 65536;

            const packet = {
                topic,
                payload,
                qos,
                messageId: newId
            };

            if (qos) {
                that.inflightCounter++;
            }

            if (that._closed || that._closing) {
                that.logger.debug({ packet }, "trying to send a packet to a disconnected client");
                forward = false;
            } else if (that.inflightCounter >= that.server.opts.maxInflightMessages) {
                that.logger.warn("too many inflight packets, closing");
                that.close(null, "too many inflight packets");
                forward = false;
            }

            if (cb) {
                cb();
            }

            // skip delivery of messages in $SYS for wildcards
            forward = forward &&
                !(topic.indexOf("$SYS") >= 0 &&
                    (
                        indexWildcard >= 0 &&
                        indexWildcard < 2 ||
                        indexPlus >= 0 &&
                        indexPlus < 2
                    )
                );

            if (forward) {
                if (options._dedupId === undefined) {
                    options._dedupId = that.server.nextDedupId();
                    that._lastDedupId = options._dedupId;
                }

                if (qos && options.messageId) {
                    that.server.updateOfflinePacket(that, options.messageId, packet, doForward);
                } else {
                    doForward(null, packet);
                }
            }
        };
    }

    unsubscribeMapTo(topic, cb) {
        const that = this;
        const sub = that.subscriptions[topic];
        if (!sub || !sub.handler) {
            that.server.emit("unsubscribed", topic, that);
            return cb();
        }

        that.server.ascoltatore.unsubscribe(topic, sub.handler, (err) => {
            if (err) {
                cb(err);
                return;
            }

            if (!that._closing || that.clean) {
                delete that.subscriptions[topic];
                that.logger.info({ topic }, "unsubscribed");
                that.server.emit("unsubscribed", topic, that);
            }

            cb();
        });
    }

    handleConnect(packet, completeConnection) {
        let that = this, logger, client = this.connection;

        this.id = packet.clientId;

        this.logger = logger = that.logger.child({ client: this });

        // for MQTT 3.1.1 (protocolVersion == 4) it is valid to receive an empty
        // clientId if cleanSession is set to 1. In this case, Mosca should generate
        // a random ID.
        // Otherwise, the connection should be rejected.
        if (!this.id) {

            if (packet.protocolVersion == 4 && packet.clean) {

                this.id = uuid.v4();
            } else {

                logger.info("identifier rejected");
                client.connack({
                    returnCode: 2
                });
                client.stream.end();
                return;
            }
        }


        that.server.authenticate(this, packet.username, packet.password,
            (err, verdict) => {

                if (err) {
                    logger.info({ username: packet.username }, "authentication error");
                    client.connack({
                        returnCode: 4
                    });
                    client.stream.end();
                    return;
                }

                if (!verdict) {
                    logger.info({ username: packet.username }, "authentication denied");
                    client.connack({
                        returnCode: 5
                    });
                    client.stream.end();
                    return;
                }

                that.keepalive = packet.keepalive;
                that.will = packet.will;

                that.clean = packet.clean;

                if (that.id in that.server.clients) {
                    that.server.clients[that.id].close(completeConnection, "new connection request");
                } else {
                    completeConnection();
                }
            });
    }

    handlePingreq() {
        const that = this;
        that.server.emit("pingreq", that);
    }

    handlePuback(packet) {
        const logger = this.logger;
        const that = this;

        logger.debug({ packet }, "puback");
        if (this.inflight[packet.messageId]) {
            this.server.emit("delivered", this.inflight[packet.messageId], that);
            this.inflightCounter--;
            delete this.inflight[packet.messageId];
            this.server.deleteOfflinePacket(this, packet.messageId, (err) => {
                if (err) {
                    return that.client && that.client.emit("error", err);
                }
                logger.debug({ packet }, "cleaned offline packet");
            });
        } else {
            logger.info({ packet }, "no matching packet");
        }
    }

    handleAuthorizeSubscribe(err, success, s, cb) {
        if (err) {
            cb(err);
            return;
        }

        if (!success) {
            this.logger.info({ topic: s.topic }, "subscribe not authorized");
            cb(null, false);
            return;
        }

        const that = this;

        const handler = function (topic, payload, options) {
            that.forward(topic, payload, options, s.topic, s.qos);
        };

        if (this.subscriptions[s.topic] === undefined) {
            this.subscriptions[s.topic] = { qos: s.qos, handler };
            this.server.ascoltatore.subscribe(
                s.topic,
                handler,
                (err) => {
                    if (err) {
                        delete that.subscriptions[s.topic];
                        cb(err);
                        return;
                    }
                    that.logger.info({ topic: s.topic, qos: s.qos }, "subscribed to topic");
                    //that.subscriptions[s.topic] = { qos: s.qos, handler: handler };
                    cb(null, true);
                }
            );
        } else {
            cb(null, true);
        }
    }

    handleSubscribe(packet) {
        let that = this, server = this.server, logger = this.logger;

        logger.debug({ packet }, "subscribe received");

        const granted = calculateGranted(this, packet);

        steed.map(this, packet.subscriptions, handleEachSub, (err, authorized) => {

            if (err) {
                that.close(null, err.message);
                return;
            }

            that.server.persistClient(that);

            packet.subscriptions.forEach((sub, index) => {
                if (authorized[index]) {
                    that.server.forwardRetained(sub.topic, that);
                    that.server.emit("subscribed", sub.topic, that);
                } else {
                    granted[index] = 0x80;
                }
            });

            if (!that._closed) {
                that.connection.suback({
                    messageId: packet.messageId,
                    granted
                });
            }
        });
    }

    handleAuthorizePublish(err, success, packet) {
        const that = this;

        // if err is passed, or success is false or undefined, terminate the connection
        if (err || !success) {
            if (!this._closed && !this._closing) {
                that.close(null, (err && err.message) || "publish not authorized");
            }
            return;
        }

        if (success instanceof Buffer) {
            packet.payload = success;
        }

        // Mosca does not support QoS2
        // if onQoS2publish === 'dropToQoS1', don't just ignore QoS2 message, puback it
        // by converting internally to qos 1.
        // this fools mqtt.js into not holding all messages forever
        // if onQoS2publish === 'disconnect', then break the client connection if QoS2
        if (packet.qos === 2) {
            switch (that.server.onQoS2publish) {
                case "dropToQoS1":
                    packet.qos = 1;
                    break;
                case "disconnect":
                    if (!this._closed && !this._closing) {
                        that.close(null, "qos2 caused disconnect");
                    }
                    return;
                    break;
                default:
                    break;
            }
        }

        const dopuback = function () {
            if (packet.qos === 1 && !(that._closed || that._closing)) {
                that.connection.puback({
                    messageId: packet.messageId
                });
            }
        };

        // if success is passed as 'ignore', ack but don't publish.
        if (success !== "ignore") {
            // publish message
            that.server.publish(packet, that, dopuback);
        } else {
            // ignore but acknowledge message
            dopuback();
        }
    }

    onNonDisconnectClose(reason) {
        let that = this, logger = that.logger, will = that.will;

        if (this._closed || this._closing) {
            return;
        }

        if (that.will) {
            logger.info({ packet: will }, "delivering last will");
            setImmediate(() => {
                that.server.authorizePublish(that, will.topic, will.payload, (err, success) => {
                    that.handleAuthorizePublish(err, success, will);
                });
            });
        }

        this.close(null, reason);
    }

    close(callback, reason) {
        callback = callback || nop;

        if (this._closed || this._closing) {
            return callback();
        }

        const that = this;

        if (this.id) {
            that.logger.debug(`closing client, reason: ${reason}`);

            if (this.timer) {
                this.timer.clear();
            }
        }

        const cleanup = function () {
            that._closed = true;

            that.logger.info("closed");
            that.connection.removeAllListeners();
            // ignore all errors after disconnection
            that.connection.on("error", () => { });
            that.server.emit("clientDisconnected", that, reason);

            callback();
        };

        that._closing = true;

        steed.map(that, Object.keys(that.subscriptions), that.unsubscribeMapTo, (err) => {
            if (err) {
                that.logger.info(err);
            }

            // needed in case of errors
            if (!that._closed) {
                cleanup();
                // prefer destroy[Soon]() to prevent FIN_WAIT zombie connections
                if (that.connection.stream.destroySoon) {
                    that.connection.stream.destroySoon();
                } else if (that.connection.stream.destroy) {
                    that.connection.stream.destroy();
                } else {
                    that.connection.stream.end();
                }
            }
        });
    }
}
