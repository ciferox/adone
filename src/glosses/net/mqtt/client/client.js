const { is, stream: { eos } } = adone;

const validations = require("./validations");
const defaultConnectOptions = {
    keepalive: 60,
    reschedulePings: true,
    protocolId: "MQTT",
    protocolVersion: 4,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    clean: true
};

const defaultId = () => `mqttjs_${Math.random().toString(16).substr(2, 8)}`;

const sendPacket = (client, packet, cb) => {
    client.emit("packetsend", packet);

    const result = adone.net.mqtt.packet.writeToStream(packet, client.stream);

    if (!result && cb) {
        client.stream.once("drain", cb);
    } else if (cb) {
        cb();
    }
};

const storeAndSend = (client, packet, cb) => {
    client.outgoingStore.put(packet, function storedPacket(err) {
        if (err) {
            return cb && cb(err);
        }
        sendPacket(client, packet, cb);
    });
};

export default class MqttClient extends adone.event.EventEmitter {
    constructor(streamBuilder, options = {}) {
        super();
        this.options = options;

        let k;

        // Defaults
        for (k in defaultConnectOptions) {
            if (is.undefined(this.options[k])) {
                this.options[k] = defaultConnectOptions[k];
            } else {
                this.options[k] = options[k];
            }
        }

        this.options.clientId = this.options.clientId || defaultId();

        this.streamBuilder = streamBuilder;

        // Inflight message storages
        this.outgoingStore = this.options.outgoingStore || new adone.net.mqtt.client.Store();
        this.incomingStore = this.options.incomingStore || new adone.net.mqtt.client.Store();

        // Should QoS zero messages be queued when the connection is broken?
        this.queueQoSZero = is.undefined(this.options.queueQoSZero) ? true : this.options.queueQoSZero;

        // map of subscribed topics to support reconnection
        this._resubscribeTopics = {};

        // Ping timer, setup in _setupPingTimer
        this.pingTimer = null;
        // Is the client connected?
        this.connected = false;
        // Are we disconnecting?
        this.disconnecting = false;
        // Packet queue
        this.queue = [];
        // connack timer
        this.connackTimer = null;
        // Reconnect timer
        this.reconnectTimer = null;
        // MessageIDs starting with 1
        this.nextId = Math.floor(Math.random() * 65535);

        // Inflight callbacks
        this.outgoing = {};

        // Mark connected on connect
        this.on("connect", () => {
            if (this.disconnected) {
                return;
            }

            this.connected = true;
            let outStore = null;
            outStore = this.outgoingStore.createStream();

            // Control of stored messages
            outStore.once("readable", () => {
                const storeDeliver = () => {
                    const packet = outStore.read(1);
                    let cb;

                    if (!packet) {
                        return;
                    }

                    // Avoid unnecesary stream read operations when disconnected
                    if (!this.disconnecting && !this.reconnectTimer && this.options.reconnectPeriod > 0) {
                        outStore.read(0);
                        cb = this.outgoing[packet.messageId];
                        this.outgoing[packet.messageId] = function (err, status) {
                            // Ensure that the original callback passed in to publish gets invoked
                            if (is.function(cb)) {
                                cb(err, status);
                            }

                            storeDeliver();
                        };
                        this._sendPacket(packet);
                    } else if (outStore.destroy) {
                        outStore.destroy();
                    }
                };
                storeDeliver();
            }).on("error", this.emit.bind(this, "error"));
        });

        // Mark disconnected on stream close
        this.on("close", () => {
            this.connected = false;
            clearTimeout(this.connackTimer);
        });

        // Setup ping timer
        this.on("connect", this._setupPingTimer);

        // Send queued packets
        this.on("connect", () => {
            const queue = this.queue;

            const deliver = () => {
                const entry = queue.shift();
                let packet = null;

                if (!entry) {
                    return;
                }

                packet = entry.packet;

                this._sendPacket(packet, (err) => {
                    if (entry.cb) {
                        entry.cb(err);
                    }
                    deliver();
                });
            };

            deliver();
        });

        let firstConnection = true;

        // resubscribe
        this.on("connect", () => {
            if (!firstConnection && this.options.clean && Object.keys(this._resubscribeTopics).length > 0) {
                this._resubscribeTopics.resubscribe = true;
                this.subscribe(this._resubscribeTopics);
            }

            firstConnection = false;
        });

        // Clear ping timer
        this.on("close", () => {
            if (!is.null(this.pingTimer)) {
                this.pingTimer.clear();
                this.pingTimer = null;
            }
        });

        // Setup reconnect timer on disconnect
        this.on("close", this._setupReconnect);

        this._setupStream();
    }

    _setupStream() {
        const that = this;
        const writable = new adone.std.stream.Writable();
        const parser = new adone.net.mqtt.packet.Parser(this.options);
        let completeParse = null;
        const packets = [];

        this._clearReconnect();

        this.stream = this.streamBuilder(this);

        parser.on("packet", (packet) => {
            packets.push(packet);
        });

        const process = () => {
            const packet = packets.shift();
            const done = completeParse;

            if (packet) {
                that._handlePacket(packet, process);
            } else {
                completeParse = null;
                done();
            }
        };

        writable._write = function (buf, enc, done) {
            completeParse = done;
            parser.parse(buf);
            process();
        };

        this.stream.pipe(writable);

        // Suppress connection errors
        this.stream.on("error", adone.noop);

        // Echo stream close
        eos(this.stream, this.emit.bind(this, "close"));

        // Send a connect packet
        const connectPacket = Object.create(this.options);
        connectPacket.cmd = "connect";
        // avoid message queue
        sendPacket(this, connectPacket);

        // Echo connection errors
        parser.on("error", this.emit.bind(this, "error"));

        // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
        this.stream.setMaxListeners(1000);

        clearTimeout(this.connackTimer);
        this.connackTimer = setTimeout(() => {
            that._cleanUp(true);
        }, this.options.connectTimeout);
    }

    _handlePacket(packet, done) {
        this.emit("packetreceive", packet);

        switch (packet.cmd) {
            case "publish":
                this._handlePublish(packet, done);
                break;
            case "puback":
            case "pubrec":
            case "pubcomp":
            case "suback":
            case "unsuback":
                this._handleAck(packet);
                done();
                break;
            case "pubrel":
                this._handlePubrel(packet, done);
                break;
            case "connack":
                this._handleConnack(packet);
                done();
                break;
            case "pingresp":
                this._handlePingresp(packet);
                done();
                break;
            default:
                // do nothing
                // maybe we should do an error handling
                // or just log it
                break;
        }
    }

    _checkDisconnecting(callback) {
        if (this.disconnecting) {
            if (callback) {
                callback(new Error("client disconnecting"));
            } else {
                this.emit("error", new Error("client disconnecting"));
            }
        }
        return this.disconnecting;
    }

    publish(topic, message, opts, callback) {
        // .publish(topic, payload, cb);
        if (is.function(opts)) {
            callback = opts;
            opts = null;
        }

        const defaultOpts = { qos: 0, retain: false, dup: false };
        opts = Object.assign(defaultOpts, opts);

        if (this._checkDisconnecting(callback)) {
            return this;
        }

        const packet = {
            cmd: "publish",
            topic,
            payload: message,
            qos: opts.qos,
            retain: opts.retain,
            messageId: this._nextId(),
            dup: opts.dup
        };

        switch (opts.qos) {
            case 1:
            case 2:

                // Add to callbacks
                this.outgoing[packet.messageId] = callback || adone.noop;
                this._sendPacket(packet);
                break;
            default:
                this._sendPacket(packet, callback);
                break;
        }

        return this;
    }

    subscribe() {
        const args = Array.prototype.slice.call(arguments);
        const subs = [];
        let obj = args.shift();
        const resubscribe = obj.resubscribe;
        let callback = args.pop() || adone.noop;
        let opts = args.pop();
        const that = this;

        delete obj.resubscribe;

        if (is.string(obj)) {
            obj = [obj];
        }

        if (!is.function(callback)) {
            opts = callback;
            callback = adone.noop;
        }

        const invalidTopic = validations.validateTopics(obj);
        if (!is.null(invalidTopic)) {
            setImmediate(callback, new Error(`Invalid topic ${invalidTopic}`));
            return this;
        }

        if (this._checkDisconnecting(callback)) {
            return this;
        }


        const defaultOpts = { qos: 0 };
        opts = Object.assign(defaultOpts, opts);

        if (is.array(obj)) {
            obj.forEach((topic) => {
                if (that._resubscribeTopics[topic] < opts.qos || !that._resubscribeTopics.hasOwnProperty(topic) || resubscribe) {
                    subs.push({
                        topic,
                        qos: opts.qos
                    });
                }
            });
        } else {
            Object.keys(obj).forEach((k) => {
                if (that._resubscribeTopics[k] < obj[k] || !that._resubscribeTopics.hasOwnProperty(k) || resubscribe) {
                    subs.push({
                        topic: k,
                        qos: obj[k]
                    });
                }
            });
        }

        const packet = {
            cmd: "subscribe",
            subscriptions: subs,
            qos: 1,
            retain: false,
            dup: false,
            messageId: this._nextId()
        };

        if (!subs.length) {
            callback(null, []);
            return;
        }

        // subscriptions to resubscribe to in case of disconnect
        subs.forEach((sub) => {
            that._resubscribeTopics[sub.topic] = sub.qos;
        });

        this.outgoing[packet.messageId] = function (err, packet) {
            if (!err) {
                const granted = packet.granted;
                for (let i = 0; i < granted.length; i += 1) {
                    subs[i].qos = granted[i];
                }
            }

            callback(err, subs);
        };

        this._sendPacket(packet);

        return this;
    }

    unsubscribe(topic, callback) {
        const packet = {
            cmd: "unsubscribe",
            qos: 1,
            messageId: this._nextId()
        };
        const that = this;

        callback = callback || adone.noop;

        if (this._checkDisconnecting(callback)) {
            return this;
        }

        if (is.string(topic)) {
            packet.unsubscriptions = [topic];
        } else if (is.object(topic) && topic.length) {
            packet.unsubscriptions = topic;
        }

        packet.unsubscriptions.forEach((topic) => {
            delete that._resubscribeTopics[topic];
        });

        this.outgoing[packet.messageId] = callback;

        this._sendPacket(packet);

        return this;
    }

    end(force, cb) {
        if (is.function(force)) {
            cb = force;
            force = false;
        }

        const closeStores = () => {
            this.disconnected = true;
            this.incomingStore.close(() => {
                this.outgoingStore.close(cb);
            });
        };

        const finish = () => {
            // defer closesStores of an I/O cycle,
            // just to make sure things are
            // ok for websockets
            this._cleanUp(force, setImmediate.bind(null, closeStores));
        };

        if (this.disconnecting) {
            return this;
        }

        this._clearReconnect();

        this.disconnecting = true;

        if (!force && Object.keys(this.outgoing).length > 0) {
            // wait 10ms, just to be sure we received all of it
            this.once("outgoingEmpty", setTimeout.bind(null, finish, 10));
        } else {
            finish();
        }

        return this;
    }

    _reconnect() {
        this.emit("reconnect");
        this._setupStream();
    }

    _setupReconnect() {
        const that = this;

        if (!that.disconnecting && !that.reconnectTimer && (that.options.reconnectPeriod > 0)) {
            if (!this.reconnecting) {
                this.emit("offline");
                this.reconnecting = true;
            }
            that.reconnectTimer = setInterval(() => {
                that._reconnect();
            }, that.options.reconnectPeriod);
        }
    }

    _clearReconnect() {
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    _cleanUp(forced, done) {
        if (done) {
            this.stream.on("close", done);
        }

        if (forced) {
            this.stream.destroy();
        } else {
            this._sendPacket(
                { cmd: "disconnect" },
                setImmediate.bind(
                    null,
                    this.stream.end.bind(this.stream)
                )
            );
        }

        if (!this.disconnecting) {
            this._clearReconnect();
            this._setupReconnect();
        }

        if (!is.null(this.pingTimer)) {
            this.pingTimer.clear();
            this.pingTimer = null;
        }
    }

    _sendPacket(packet, cb) {
        if (!this.connected) {
            if ((packet.qos === 0 && this.queueQoSZero) || packet.cmd !== "publish") {
                this.queue.push({ packet, cb });
            } else if (packet.qos > 0) {
                this.outgoingStore.put(packet, (err) => {
                    if (err) {
                        return cb && cb(err);
                    }
                });
            } else if (cb) {
                cb(new Error("No connection to broker"));
            }

            return;
        }

        // When sending a packet, reschedule the ping timer
        this._shiftPingInterval();

        if (packet.cmd !== "publish") {
            sendPacket(this, packet, cb);
            return;
        }

        switch (packet.qos) {
            case 2:
            case 1:
                storeAndSend(this, packet, cb);
                break;
            /**
             * no need of case here since it will be caught by default
             * and jshint comply that before default it must be a break
             * anyway it will result in -1 evaluation
             */
            case 0:
            /* falls through */
            default:
                sendPacket(this, packet, cb);
                break;
        }
    }

    _setupPingTimer() {
        const that = this;

        if (!this.pingTimer && this.options.keepalive) {
            this.pingResp = true;
            this.pingTimer = adone.util.reinterval(() => {
                that._checkPing();
            }, this.options.keepalive * 1000);
        }
    }

    _shiftPingInterval() {
        if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
            this.pingTimer.reschedule(this.options.keepalive * 1000);
        }
    }

    _checkPing() {
        if (this.pingResp) {
            this.pingResp = false;
            this._sendPacket({ cmd: "pingreq" });
        } else {
            // do a forced cleanup since socket will be in bad shape
            this._cleanUp(true);
        }
    }

    _handlePingresp() {
        this.pingResp = true;
    }

    _handleConnack(packet) {
        const rc = packet.returnCode;
        const errors = [
            "",
            "Unacceptable protocol version",
            "Identifier rejected",
            "Server unavailable",
            "Bad username or password",
            "Not authorized"
        ];

        clearTimeout(this.connackTimer);

        if (rc === 0) {
            this.reconnecting = false;
            this.emit("connect", packet);
        } else if (rc > 0) {
            const err = new Error(`Connection refused: ${errors[rc]}`);
            err.code = rc;
            this.emit("error", err);
        }
    }

    _handlePublish(packet, done) {
        const topic = packet.topic.toString();
        const message = packet.payload;
        const qos = packet.qos;
        const mid = packet.messageId;
        const that = this;

        switch (qos) {
            case 2:
                this.incomingStore.put(packet, () => {
                    that._sendPacket({ cmd: "pubrec", messageId: mid }, done);
                });
                break;
            case 1:
                // do not wait sending a puback
                // no callback passed
                this._sendPacket({
                    cmd: "puback",
                    messageId: mid
                });
            /* falls through */
            case 0:
                // emit the message event for both qos 1 and 0
                this.emit("message", topic, message, packet);
                this.handleMessage(packet, done);
                break;
            default:
                // do nothing
                // log or throw an error about unknown qos
                break;
        }
    }

    handleMessage(packet, callback) {
        callback();
    }

    _handleAck(packet) {
        /* eslint no-fallthrough: "off" */
        const mid = packet.messageId;
        const type = packet.cmd;
        let response = null;
        const cb = this.outgoing[mid];
        const that = this;

        if (!cb) {
            // Server sent an ack in error, ignore it.
            return;
        }

        // Process
        switch (type) {
            case "pubcomp":
            // same thing as puback for QoS 2
            case "puback":
                // Callback - we're done
                delete this.outgoing[mid];
                this.outgoingStore.del(packet, cb);
                break;
            case "pubrec":
                response = {
                    cmd: "pubrel",
                    qos: 2,
                    messageId: mid
                };

                this._sendPacket(response);
                break;
            case "suback":
                delete this.outgoing[mid];
                cb(null, packet);
                break;
            case "unsuback":
                delete this.outgoing[mid];
                cb(null);
                break;
            default:
                that.emit("error", new Error("unrecognized packet type"));
        }

        if (this.disconnecting && Object.keys(this.outgoing).length === 0) {
            this.emit("outgoingEmpty");
        }
    }

    _handlePubrel(packet, callback) {
        const mid = packet.messageId;
        const that = this;

        that.incomingStore.get(packet, (err, pub) => {
            if (err) {
                return that.emit("error", err);
            }

            if (pub.cmd !== "pubrel") {
                that.emit("message", pub.topic, pub.payload, pub);
                that.incomingStore.put(packet);
            }

            that._sendPacket({ cmd: "pubcomp", messageId: mid }, callback);
        });
    }

    _nextId() {
        const id = this.nextId++;
        // Ensure 16 bit unsigned int:
        if (id === 65535) {
            this.nextId = 1;
        }
        return id;
    }

    getLastMessageId() {
        return (this.nextId === 1) ? 65535 : (this.nextId - 1);
    }
}
