const steed = require("steed");
const ascoltatori = require("ascoltatori");
require("./common");
const abstractServerTests = require("./abstract_server");
const net = require("net");
const createConnection = require("./helpers/createConnection");

const moscaSettings = function () {
    return {
        port: nextPort(),
        stats: false,
        publishNewClient: false,
        persistence: {
            factory: adone.net.mqtt.server.persistence.Memory
        },
        logger: {
            level: "error"
        }
    };
};

describe("net", "mqtt", "server", "Server", () => {
    abstractServerTests(moscaSettings, createConnection);

    function buildClient(instance, done, callback) {
        const client = createConnection(instance.opts.port);

        client.once("error", done);
        client.stream.once("close", () => {
            done();
        });

        client.on("connected", () => {
            callback(client);
        });
    }

    function buildAndConnect(done, instance, opts, callback) {

        if (typeof opts === "function") {
            callback = opts;
            opts = buildOpts();
        }

        buildClient(instance, done, (client) => {
            client.opts = opts;

            client.connect(opts);

            client.on("connack", (packet) => {
                callback(client);
            });
        });
    }

    it("should close twice", function (done) {
        this.instance.close(done);
    });

    it("should not emit \"clientDisconnected\" for a non-mqtt client", function (done) {
        const stream = net.connect({ port: this.settings.port });

        this.instance.on("clientDisconnected", done);

        stream.on("connect", () => {
            stream.end();
            done();
        });

        stream.on("error", (err) => {
            // swallow errors
        });
    });

    it("should emit \"pingreq\" of the corresponding client at a pingreq", function (done) {

        const instance = this.instance;
        buildClient(instance, done, (client) => {

            const clientId = "client";
            const opts = buildOpts();
            opts.clientId = clientId;

            client.connect(opts);

            instance.on("pingreq", (c) => {
                expect(c.id).to.equal(clientId);
                client.disconnect();
            });

            client.pingreq();

        });
    });

    it("should pass mosca options to backend when publishing", function (done) {
        const instance = this.instance;
        buildClient(instance, done, (client) => {

            instance.ascoltatore.subscribe("hello", (topic, message, options) => {
                expect(options).to.have.property("messageId");
                expect(options).to.have.property("qos", 1);
                client.disconnect();
            });

            client.connect(buildOpts());

            client.on("connack", (packet) => {
                expect(packet.returnCode).to.eql(0);

                const messageId = Math.floor(65535 * Math.random());

                client.publish({
                    topic: "hello",
                    qos: 1,
                    payload: "world",
                    messageId
                });
            });
        });
    });

    it("should support subscribing with overlapping topics and receiving message only once", function (done) {
        const d = donner(2, done);
        const that = this;
        buildAndConnect(d, this.instance, buildOpts(), (client1) => {

            const messageId = Math.floor(65535 * Math.random());
            const subscriptions = [{
                topic: "a/+",
                qos: 1
            }, {
                topic: "+/b",
                qos: 1
            }, {
                topic: "a/b",
                qos: 1
            }
            ];
            let called = 0;

            client1.on("publish", (packet) => {
                client1.puback({ messageId: packet.messageId });
                expect(packet.topic).to.equal("a/b");
                expect(packet.payload.toString()).to.equal("some other data");
                expect(called++).to.equal(0);
            });

            client1.on("suback", () => {
                buildAndConnect(d, that.instance, buildOpts(), (client2) => {

                    client2.on("puback", () => {
                        client1.disconnect();
                        client2.disconnect();
                    });

                    client2.publish({
                        topic: "a/b",
                        payload: "some other data",
                        messageId,
                        qos: 1
                    });
                });
            });

            client1.subscribe({
                subscriptions,
                messageId
            });
        });
    });

    it("should not receive the publish after unsubscription, while multi subscriptions with the same topic", function (done) {

        // Simulate a situation that it takes same time to do authorizeSubscribe.
        this.instance.authorizeSubscribe = function (client, topic, callback) {
            setTimeout(() => {
                callback(null, true);
            }, 300);
        };

        buildAndConnect(() => { }, this.instance, (client) => {
            function subAction() {
                const messageId = Math.floor(65535 * Math.random());
                client.subscribe({
                    subscriptions: [{ topic: "hello", qos: 1 }],
                    messageId
                });
            }

            const subCount = 3;  // subscribe the same topic for 3 times
            for (let i = 0; i < subCount; ++i) {
                subAction();
            }

            let subackCount = 0;
            client.on("suback", () => { // unsubscribe after subscriptions
                subackCount++;
                if (subackCount == subCount) {
                    const messageId = Math.floor(65535 * Math.random());
                    client.unsubscribe({
                        unsubscriptions: ["hello"],
                        messageId
                    });
                }
            });

            client.on("unsuback", () => { // publish message after unsubscription
                const messageId = Math.floor(65535 * Math.random());
                client.publish({
                    topic: "hello",
                    payload: "some data",
                    messageId,
                    qos: 1
                });
            });

            client.on("publish", (packet) => { // should not receive the publish
                done(new Error("unexpected publish"));
            });

            client.on("puback", (packet) => { // close client when puback
                client.disconnect();
                done();
            });
        });
    });

    it("should fail if persistence can not connect", (done) => {
        const newSettings = moscaSettings();

        newSettings.persistence = {
            factory: adone.net.mqtt.server.persistence.Mongo,
            url: "mongodb://someUrlCannotConnect"
        };

        const server = new adone.net.mqtt.server.Server(newSettings, (err) => {
            if (err instanceof Error) {
                done();
            } else {
                expect().fail("new adone.net.mqtt.server.Server should fail");
            }
        });
    });

    it("should support subscribing via server.subscribe", function (done) {
        const that = this;
        buildAndConnect(done, this.instance, buildOpts(), (client) => {

            that.instance.subscribe("a/+", (topic, payload) => {
                expect(topic).to.be.equal("a/b");
                expect(payload.toString()).to.be.equal("some data");
                client.disconnect();
            }, () => {
                const messageId = Math.floor(65535 * Math.random());
                client.publish({
                    topic: "a/b",
                    payload: "some data",
                    messageId,
                    qos: 1
                });
            });
        });
    });

    it("should provide packet in publish callback", function (done) {
        let messageId;

        this.instance.once("published", (packet) => {
            messageId = packet.messageId;
        });

        this.instance.publish({
            topic: "hello",
            payload: "some data"
        }, (error, packet) => {
            expect(packet.topic).to.be.equal("hello");
            expect(packet.payload.toString().toString()).to.be.equal("some data");
            expect(packet.messageId.toString()).to.equal(messageId);
            done();
        });
    });

    it("should emit \"clientError\" when client error occurs due to unexpected disconnection", function (done) {
        const instance = this.instance;
        // listen to a client error event
        instance.once("clientError", (error, client) => {
            expect(error).to.be.an("error");
            done();
        });
        // cause a connection error between client and server
        buildAndConnect(() => { }, instance, (client) => {
            instance.clients[client.opts.clientId].connection.emit("error", new Error());
        });
    });

    describe("timers", () => {
        function fastForward(increase, max) {
            if (increase < max) {
                setImmediate(fastForward.bind(null, increase, max - increase));
            }
        }

        it("should close the connection after the keepalive interval", function (done) {
            buildClient(this.instance, done, (client) => {
                const keepalive = 1;
                const timer = Date.now();

                const opts = buildOpts();
                opts.keepalive = keepalive;

                client.connect(opts);

                client.stream.on("close", () => {
                    const interval = (Date.now() - timer) / 1000;
                    expect(interval).to.be.least(keepalive * 3 / 2);
                });

                fastForward(100, 4000);
            });
        });

        it("should correctly renew the keepalive window after a pingreq", function (done) {
            buildClient(this.instance, done, (client) => {
                const keepalive = 1;
                const timer = Date.now();

                const opts = buildOpts();
                opts.keepalive = keepalive;

                client.connect(opts);

                client.stream.on("close", () => {
                    const interval = (Date.now() - timer) / 1000;
                    expect(interval).to.be.least(keepalive + keepalive / 2);
                });

                setTimeout(() => {
                    client.pingreq();
                }, keepalive * 1000 / 2);

                fastForward(100, 4000);
            });
        });

        it("should correctly renew the keepalive window after a subscribe", function (done) {
            buildClient(this.instance, done, (client) => {
                const keepalive = 1;
                const timer = Date.now();

                const opts = buildOpts();
                opts.keepalive = keepalive;

                const messageId = Math.floor(65535 * Math.random());
                const subscriptions = [{
                    topic: "hello",
                    qos: 0
                }
                ];

                client.connect(opts);

                client.stream.on("close", () => {
                    const interval = (Date.now() - timer) / 1000;
                    expect(interval).to.be.least(keepalive + keepalive / 2);
                });

                setTimeout(() => {
                    client.subscribe({
                        subscriptions,
                        messageId
                    });
                }, keepalive * 1000 / 2);

                fastForward(100, 4000);
            });
        });

        it("should correctly renew the keepalive window after a publish", function (done) {
            buildClient(this.instance, done, (client) => {
                const keepalive = 1;
                const timer = Date.now();

                const opts = buildOpts();
                opts.keepalive = keepalive;

                const messageId = Math.floor(65535 * Math.random());

                client.connect(opts);

                client.stream.on("close", () => {
                    const interval = (Date.now() - timer) / 1000;
                    expect(interval).to.be.least(keepalive + keepalive / 2);
                });

                setTimeout(() => {
                    client.publish({
                        topic: "hello",
                        payload: "some data",
                        messageId
                    });
                }, keepalive * 1000 / 2);

                fastForward(100, 4000);
            });
        });

        it("should correctly renew the keepalive window after a puback", function (done) {
            const instance = this.instance;
            buildClient(this.instance, done, (client) => {
                const keepalive = 1;

                const opts = buildOpts();
                opts.keepalive = keepalive;
                let closed = false;
                let timer;

                const messageId = Math.floor(65535 * Math.random());
                const subscriptions = [{
                    topic: "hello",
                    qos: 1
                }
                ];

                client.connect(opts);

                client.on("connack", () => {
                    client.subscribe({
                        subscriptions,
                        messageId
                    });
                });

                client.on("suback", () => {
                    timer = Date.now();
                    instance.publish({ topic: "hello", payload: "world" });
                });

                client.stream.on("close", () => {
                    closed = true;
                    const interval = (Date.now() - timer) / 1000;
                    expect(interval).to.be.least(keepalive + keepalive / 2);
                });

                client.on("publish", (packet) => {
                    if (closed) {
                        return;
                    }

                    setTimeout(() => {
                        client.puback({ messageId: packet.messageId });
                    }, keepalive * 1000 / 2);
                });

                fastForward(50, 3000);
            });
        });

        it("should correctly renew the keepalive window after an unsubscribe", function (done) {
            buildClient(this.instance, done, (client) => {
                const keepalive = 1;
                const timer = Date.now();

                const opts = buildOpts();
                opts.keepalive = keepalive;

                const messageId = Math.floor(65535 * Math.random());
                const subscriptions = [{
                    topic: "hello",
                    qos: 0
                }
                ];

                client.connect(opts);
                client.subscribe({
                    subscriptions,
                    messageId
                });

                client.stream.on("close", () => {
                    const interval = (Date.now() - timer) / 1000;
                    expect(interval).to.be.least(keepalive + keepalive / 2);
                });

                setTimeout(() => {
                    client.unsubscribe({
                        unsubscriptions: ["hello"],
                        messageId
                    });
                }, keepalive * 1000 / 2);

                fastForward(100, keepalive * 2 * 1000);
            });
        });

        it("should allow unsubscription without any subscriptions", function (done) {
            buildClient(this.instance, done, (client) => {
                const keepalive = 1;
                const timer = Date.now();

                const opts = buildOpts();
                opts.keepalive = keepalive;

                const messageId = Math.floor(65535 * Math.random());
                const subscriptions = [{
                    topic: "hello",
                    qos: 0
                }
                ];
                client.connect(opts);

                client.unsubscribe({
                    unsubscriptions: ["hello"],
                    messageId
                });

                fastForward(100, keepalive * 2 * 1000);
            });
        });

    });

    describe("stats", () => {
        let clock;
        let stats;

        beforeEach(function (done) {
            clock = fakeClock.install("setTimeout", "clearTimeout", "setInterval", "clearInterval");
            const that = this;
            this.instance.close(() => {
                that.settings = moscaSettings();
                that.settings.stats = true;
                that.instance = new adone.net.mqtt.server.Server(that.settings, done);
                stats = that.instance.stats;
            });
        });

        afterEach(function (done) {
            clock.uninstall();
            this.instance.close(done);
        });

        it("should maintain a counter of all connected clients", function (done) {
            const d = donner(2, done);
            const instance = this.instance;
            buildAndConnect(d, instance, (client1) => {
                expect(stats.connectedClients).to.eql(1);
                buildAndConnect(d, instance, (client2) => {
                    // disconnect will happen after the next tick, has it"s an I/O operation
                    client1.disconnect();
                    client2.disconnect();
                    expect(stats.connectedClients).to.eql(2);
                });
            });
        });

        it("should maintain a counter of all connected clients (bis)", function (done) {
            const d = donner(2, done);
            const instance = this.instance;
            buildAndConnect(d, instance, (client1) => {
                buildAndConnect(d, instance, (client2) => {
                    // disconnect will happen after the next tick, has it"s an I/O operation
                    client2.disconnect();
                });
                instance.once("clientDisconnected", () => {
                    client1.disconnect();
                    expect(stats.connectedClients).to.eql(1);

                    instance.once("clientDisconnected", () => {
                        expect(stats.connectedClients).to.eql(0);
                    });
                });
            });
        });

        it("should maintain a counter of all published messages", function (done) {
            buildAndConnect(done, this.instance, (client1) => {
                expect(stats.publishedMessages).to.eql(0);

                client1.publish({
                    topic: "hello",
                    payload: "some data",
                    messageId: 42,
                    qos: 1
                });

                client1.on("puback", () => {
                    client1.disconnect();
                    expect(stats.publishedMessages).to.eql(1);
                });
            });
        });

        it("should publish data each minute", function (done) {
            const instance = this.instance;
            buildAndConnect(done, instance, (client1) => {
                const topic = `$SYS/${instance.id}/clients/connected`;
                instance.ascoltatore.subscribe(topic, function callback(topic, value) {
                    expect(value).to.eql("1");
                    client1.disconnect();
                    instance.ascoltatore.unsubscribe(topic, callback);
                });
                clock.tick(60 * 1000);
            });
        });

    });
});

// Move these tests back to abstract_server after ascoltatori change made to support MqttSecureClient
describe("adone.net.mqtt.server.Server - MQTT backend", () => {
    let instance;
    let secondInstance;
    let settings;

    beforeEach((done) => {
        settings = moscaSettings();
        instance = new adone.net.mqtt.server.Server(settings, done);
        secondInstance = null;
    });

    afterEach((done) => {
        let instances = [instance];

        if (secondInstance) {
            instances = [secondInstance].concat(instances);
        }

        steed.parallel(instances.map((i) => {
            return function (cb) {
                i.close(cb);
            };
        }), () => {
            done();
            instance = null;
            secondInstance = null;
        });
    });

    function buildClient(done, callback) {
        const client = createConnection(settings.port);

        client.once("error", done);
        client.stream.once("close", () => {
            done();
        });

        client.on("connected", () => {
            callback(client);
        });
    }

    function buildAndConnect(done, opts, callback) {

        if (typeof opts === "function") {
            callback = opts;
            opts = buildOpts();
        }

        buildClient(done, (client) => {

            client.connect(opts);

            client.on("connack", (packet) => {
                callback(client);
            });
        });
    }

    it("should pass the backend settings to ascoltatori.build", (done) => {
        const s = spy(ascoltatori, "build");
        const newSettings = moscaSettings();

        newSettings.backend = {
            type: "mqtt",
            json: false,
            port: settings.port,
            keepalive: 3000,
            host: "127.0.0.1",
            hostname: "127.0.0.1",
            mqtt: require("mqtt"),
            clientId: "myclientid",
            clean: true,
            protocol: "mqtt",
            protocolId: "MQTT",
            connectTimeout: 30000,
            reconnectPeriod: 1000,
            reschedulePings: true,
            wildcardSome: "#",
            wildcardOne: "+",
            protocolVersion: 4
        };

        const server = new adone.net.mqtt.server.Server(newSettings);

        steed.series([

            function (cb) {
                server.on("ready", cb);
            },

            function (cb) {
                // because of a spurious "encoding" property in MQTT.js
                expect(s).to.have.been.calledWith(newSettings.backend);
                cb();
            },

            function (cb) {
                server.close(cb);
            }
        ], done);
    });

    it("should support subscribing correctly to wildcards in a tree-based topology", (done) => {
        const d = donner(3, done);

        steed.waterfall([

            function (cb) {
                settings.backend = {
                    port: settings.port,
                    type: "mqtt"
                };
                settings.port = nextPort();
                secondInstance = new adone.net.mqtt.server.Server(settings, () => {
                    cb();
                });
            },

            function (cb) {
                buildAndConnect(d, (client1) => {
                    cb(null, client1);
                });
            },

            function (client1, cb) {
                let called = false;
                client1.on("publish", (packet) => {
                    expect(called).to.be.eql(false);
                    called = true;
                    setTimeout(() => {
                        client1.disconnect();
                    });
                });

                const subscriptions = [{
                    topic: "hello/#",
                    qos: 0
                }
                ];
                client1.subscribe({
                    subscriptions,
                    messageId: 42
                });

                client1.on("suback", () => {
                    cb(null);
                });
            },

            function (cb) {
                buildAndConnect(d, (client3) => {
                    cb(null, client3);
                });
            },

            function (client3, cb) {
                const subscriptions = [{
                    topic: "hello/#",
                    qos: 0
                }
                ];
                client3.subscribe({
                    subscriptions,
                    messageId: 42
                });
                client3.on("suback", () => {
                    // we need to simulate a "stuck" subscription
                    client3.stream.end();
                    cb(null);
                });
            },

            function (cb) {
                buildAndConnect(d, (client2) => {
                    cb(null, client2);
                });
            },

            function (client2, cb) {
                client2.publish({
                    topic: "hello/world",
                    payload: "some data"
                });
                client2.disconnect();
            }
        ]);
    });

    it("should not wrap messages with \"\" in a tree-based topology", (done) => {
        const d = donner(2, done);

        steed.waterfall([

            function (cb) {
                buildAndConnect(d, (client1) => {
                    cb(null, client1);
                });
            },

            function (client1, cb) {
                client1.on("publish", (packet) => {
                    expect(packet.payload.toString()).to.be.eql("some data");
                    client1.disconnect();
                });

                const subscriptions = [{
                    topic: "hello/#",
                    qos: 0
                }
                ];

                client1.subscribe({
                    subscriptions,
                    messageId: 42
                });
                client1.on("suback", () => {
                    cb(null);
                });
            },

            function (cb) {
                settings.backend = {
                    port: settings.port,
                    type: "mqtt"
                };
                settings.port = settings.port + 1000;
                secondInstance = new adone.net.mqtt.server.Server(settings, () => {
                    cb();
                });
            },

            function (cb) {
                buildAndConnect(d, (client2) => {
                    cb(null, client2);
                });
            },

            function (client2, cb) {
                client2.publish({
                    topic: "hello/world",
                    payload: "some data"
                });
                client2.disconnect();
            }
        ]);
    });

    it("should build the correct persistence", (done) => {
        const newSettings = moscaSettings();

        newSettings.persistence = {
            factory: adone.net.mqtt.server.persistence.Redis,
            port: 6379,
            host: "localhost"
        };

        const s = spy(newSettings.persistence, "factory");

        const server = new adone.net.mqtt.server.Server(newSettings);

        steed.series([

            function (cb) {
                server.on("ready", cb);
            },

            function (cb) {
                expect(s).to.have.been.calledWith(newSettings.persistence);
                cb();
            },

            function (cb) {
                server.close(cb);
            }
        ], done);
    });

    it("should build the correct persistence with string", (done) => {
        const newSettings = moscaSettings();

        newSettings.persistence = {
            factory: "redis",
            port: 6379,
            host: "localhost"
        };

        const server = new adone.net.mqtt.server.Server(newSettings);

        steed.series([

            function (cb) {
                server.on("ready", cb);
            },

            function (cb) {
                expect(server.persistence.constructor).to.match(/RedisPersistence/);
                cb();
            },

            function (cb) {
                server.close(cb);
            }
        ], done);
    });

    it("should fail if persistence string is not correct", (done) => {
        const newSettings = moscaSettings();

        newSettings.persistence = {
            factory: "no_such_persistence",
            port: 6379,
            host: "localhost"
        };

        const server = new adone.net.mqtt.server.Server(newSettings, (err) => {
            if (err instanceof Error) {
                done();
            } else {
                expect().fail("new adone.net.mqtt.server.Server should fail");
            }
        });
    });


});
