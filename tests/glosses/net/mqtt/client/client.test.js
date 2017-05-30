const { stream: { eos }, std: { path, net, child_process: { fork } } } = adone;
const { connect, Client } = adone.net.mqtt.client;
const abstractClientTests = require("./abstract_client");
import { MqttServer } from "./server";
const port = 9876;

/**
 * Test server
 */
function buildServer() {
    return new MqttServer((client) => {
        client.on("connect", (packet) => {
            if (packet.clientId === "invalid") {
                client.connack({ returnCode: 2 });
            } else {
                client.connack({ returnCode: 0 });
            }
        });

        client.on("publish", (packet) => {
            setImmediate(() => {
                switch (packet.qos) {
                    case 0:
                        break;
                    case 1:
                        client.puback(packet);
                        break;
                    case 2:
                        client.pubrec(packet);
                        break;
                }
            });
        });

        client.on("pubrel", (packet) => {
            client.pubcomp(packet);
        });

        client.on("pubrec", (packet) => {
            client.pubrel(packet);
        });

        client.on("pubcomp", () => {
            // Nothing to be done
        });

        client.on("subscribe", (packet) => {
            client.suback({
                messageId: packet.messageId,
                granted: packet.subscriptions.map((e) => {
                    return e.qos;
                })
            });
        });

        client.on("unsubscribe", (packet) => {
            client.unsuback(packet);
        });

        client.on("pingreq", () => {
            client.pingresp();
        });
    });
}

const server = buildServer().listen(port);

describe("net", "mqtt", "client", "MqttClient", () => {
    describe("creating", () => {
        it("should allow instantiation of MqttClient without the 'new' operator", (done) => {
            assert.doesNotThrow(() => {
                let client;
                try {
                    client = new Client(() => {
                        throw Error("break");
                    }, {});
                    client.end();
                } catch (err) {
                    if (err.message !== "break") {
                        throw err;
                    }
                    done();
                }
            });
        });
    });

    const config = { protocol: "mqtt", port };
    abstractClientTests(server, config);

    describe("message ids", () => {
        it("should increment the message id", () => {
            const client = connect(config);
            const currentId = client._nextId();

            assert.equal(client._nextId(), currentId + 1);
            client.end();
        });

        it("should return 1 once the interal counter reached limit", () => {
            const client = connect(config);
            client.nextId = 65535;

            assert.equal(client._nextId(), 65535);
            assert.equal(client._nextId(), 1);
            client.end();
        });

        it("should return 65535 for last message id once the interal counter reached limit", () => {
            const client = connect(config);
            client.nextId = 65535;

            assert.equal(client._nextId(), 65535);
            assert.equal(client.getLastMessageId(), 65535);
            assert.equal(client._nextId(), 1);
            assert.equal(client.getLastMessageId(), 1);
            client.end();
        });
    });

    describe("reconnecting", () => {
        it("should attempt to reconnect once server is down", async () => {
            const port = await adone.net.util.getFreePort();
            const innerServer = fork(path.join(__dirname, "helpers", "server_process.js"), [port]);
            const client = connect({ port, host: "localhost", keepalive: 1 });

            await new Promise((resolve) => client.once("connect", resolve));
            innerServer.kill("SIGINT"); // mocks server shutdown
            await new Promise((resolve) => client.once("close", resolve));
            assert.exists(client.reconnectTimer);
            client.end();
        });

        it("should reconnect to multiple host-ports combination if servers is passed", function (done) {
            this.timeout(15000);

            const server2 = buildServer().listen(port + 42);

            server2.on("client", (c) => {
                c.stream.destroy();
                server2.close();
            });

            server2.on("listening", () => {
                const client = connect({
                    servers: [
                        { port: port + 42, host: "localhost" },
                        { port, host: "localhost" }
                    ],
                    keepalive: 50
                });

                server.once("client", () => {
                    client.end();
                    done();
                });

                client.once("connect", () => {
                    client.stream.destroy();
                });
            });
        });

        it("should reconnect if a connack is not received in an interval", function (done) {
            this.timeout(2000);

            const server2 = net.createServer().listen(port + 43);

            server2.on("connection", (c) => {
                eos(c, () => {
                    server2.close();
                });
            });

            server2.on("listening", () => {
                const client = connect({
                    servers: [
                        { port: port + 43, host: "localhost_fake" },
                        { port, host: "localhost" }
                    ],
                    connectTimeout: 500
                });

                server.once("client", () => {
                    client.end();
                    done();
                });

                client.once("connect", () => {
                    client.stream.destroy();
                });
            });
        });

        it("should not be cleared by the connack timer", function (done) {
            this.timeout(4000);

            const server2 = net.createServer().listen(port + 44);

            server2.on("connection", (c) => {
                c.destroy();
            });

            server2.once("listening", () => {
                let reconnects = 0;
                const connectTimeout = 1000;
                const reconnectPeriod = 100;
                const expectedReconnects = Math.floor(connectTimeout / reconnectPeriod);
                const client = connect({
                    port: port + 44,
                    host: "localhost",
                    connectTimeout,
                    reconnectPeriod
                });

                client.on("reconnect", () => {
                    reconnects++;
                    if (reconnects >= expectedReconnects) {
                        client.end();
                        done();
                    }
                });
            });
        });

        it("shoud not keep requeueing the first message when offline", function (done) {
            this.timeout(2500);

            const server2 = buildServer().listen(port + 45);
            const client = connect({
                port: port + 45,
                host: "localhost",
                connectTimeout: 350,
                reconnectPeriod: 300
            });

            server2.on("client", (c) => {
                client.publish("hello", "world", { qos: 1 }, () => {
                    c.destroy();
                    server2.close();
                    client.publish("hello", "world", { qos: 1 });
                });
            });

            setTimeout(() => {
                if (client.queue.length === 0) {
                    client.end(true);
                    done();
                } else {
                    client.end(true);
                }
            }, 2000);
        });

        it("should not send the same subcribe multiple times on a flaky connection", function (done) {
            this.timeout(3500);

            const KILL_COUNT = 4;
            let killedConnections = 0;
            const subIds = {};
            const client = connect({
                port: port + 46,
                host: "localhost",
                connectTimeout: 350,
                reconnectPeriod: 300
            });

            const server2 = new MqttServer((client) => {
                client.on("error", () => { });
                client.on("connect", (packet) => {
                    if (packet.clientId === "invalid") {
                        client.connack({ returnCode: 2 });
                    } else {
                        client.connack({ returnCode: 0 });
                    }
                });
            }).listen(port + 46);

            server2.on("client", (c) => {
                client.subscribe("topic", () => {
                    done();
                    client.end(true);
                    c.destroy();
                    server2.close();
                });

                c.on("subscribe", (packet) => {
                    if (killedConnections < KILL_COUNT) {
                        // Kill the first few sub attempts to simulate a flaky connection
                        killedConnections++;
                        c.destroy();
                    } else {
                        // Keep track of acks
                        if (!subIds[packet.messageId]) {
                            subIds[packet.messageId] = 0;
                        }
                        subIds[packet.messageId]++;
                        if (subIds[packet.messageId] > 1) {
                            done(new Error(`Multiple duplicate acked subscriptions received for messageId ${packet.messageId}`));
                            client.end(true);
                            c.destroy();
                            server2.destroy();
                        }

                        c.suback({
                            messageId: packet.messageId,
                            granted: packet.subscriptions.map((e) => {
                                return e.qos;
                            })
                        });
                    }
                });
            });
        });

        it("should not fill the queue of subscribes if it cannot connect", function (done) {
            this.timeout(2500);

            const port2 = port + 48;

            const server2 = net.createServer((stream) => {
                const client = new adone.net.mqtt.connection.Connection(stream);

                client.on("error", () => { });
                client.on("connect", (packet) => {
                    client.connack({ returnCode: 0 });
                    client.destroy();
                });
            });

            server2.listen(port2, () => {
                const client = connect({
                    port: port2,
                    host: "localhost",
                    connectTimeout: 350,
                    reconnectPeriod: 300
                });

                client.subscribe("hello");

                setTimeout(() => {
                    assert.equal(client.queue.length, 1);
                    client.end();
                    done();
                }, 1000);
            });
        });

        it("should not send the same publish multiple times on a flaky connection", function (done) {
            this.timeout(3500);

            const KILL_COUNT = 4;
            let killedConnections = 0;
            const pubIds = {};
            const client = connect({
                port: port + 47,
                host: "localhost",
                connectTimeout: 350,
                reconnectPeriod: 300
            });

            const server2 = net.createServer(function (stream) {
                const client = new adone.net.mqtt.connection.Connection(stream);
                client.on("error", () => { });
                client.on("connect", (packet) => {
                    if (packet.clientId === "invalid") {
                        client.connack({ returnCode: 2 });
                    } else {
                        client.connack({ returnCode: 0 });
                    }
                });

                this.emit("client", client);
            }).listen(port + 47);

            server2.on("client", (c) => {
                client.publish("topic", "data", { qos: 1 }, () => {
                    done();
                    client.end(true);
                    c.destroy();
                    server2.destroy();
                });

                c.on("publish", function onPublish(packet) {
                    if (killedConnections < KILL_COUNT) {
                        // Kill the first few pub attempts to simulate a flaky connection
                        killedConnections++;
                        c.destroy();

                        // to avoid receiving inflight messages
                        c.removeListener("publish", onPublish);
                    } else {
                        // Keep track of acks
                        if (!pubIds[packet.messageId]) {
                            pubIds[packet.messageId] = 0;
                        }

                        pubIds[packet.messageId]++;

                        if (pubIds[packet.messageId] > 1) {
                            done(new Error(`Multiple duplicate acked publishes received for messageId ${packet.messageId}`));
                            client.end(true);
                            c.destroy();
                            server2.destroy();
                        }

                        c.puback(packet);
                    }
                });
            });
        });
    });
});
