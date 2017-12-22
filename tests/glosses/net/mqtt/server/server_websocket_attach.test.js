require("./common");
const mqtt = require("mqtt");

const port = nextPort();
const path = "/test";
const mqttPath = "/mqttws";
const mqttTopic = "atopic";
const ping = "ping";
const pong = "pong";

describe("mosca.Server - Mqtt-over-WS attached to existing http server", () => {
    let server;
    let mqttServ;

    beforeEach(() => {
        server = adone.std.http.createServer();
        mqttServ = new adone.net.mqtt.server.Server({ interfaces: [] });
    });

    afterEach(() => {
        server.close();
    });

    it("should not occupy 1883 port while attached to http server", (done) => {
        mqttServ.attachHttpServer(server);
        server.listen(1883, done);
    });

    it("should be able to do mqtt over WebSocket", (done) => {
        mqttServ.attachHttpServer(server);
        server.listen(port, () => {
            const client = mqtt.connect(`ws://localhost:${port}`);
            client.subscribe(mqttTopic);
            client.on("message", (topic, payload) => {
                expect(topic).to.equal(mqttTopic);
                expect(payload.toString()).to.equal(ping);
                done();
            });
            client.publish(mqttTopic, ping);
        });
    });

    it("should be able to do mqtt over WebSocket on specific path", (done) => {
        mqttServ.attachHttpServer(server, mqttPath);
        server.listen(port, () => {
            const client = mqtt.connect(`ws://localhost:${port}${mqttPath}`);
            client.subscribe(mqttTopic);
            client.on("message", (topic, payload) => {
                expect(topic).to.equal(mqttTopic);
                expect(payload.toString()).to.equal(ping);
                done();
            });
            client.publish(mqttTopic, ping);
        });
    });

    it("should not be able to do mqtt over WebSocket on different path", (done) => {
        mqttServ.attachHttpServer(server, mqttPath);
        server.listen(port, () => {
            const client = mqtt.connect(`ws://localhost:${port}/junk`);
            client.subscribe(mqttTopic);
            let failed = false;// ensuring done is called once
            client.on("message", (topic, payload) => {
                failed = true;
                done(failed);
            });
            client.publish(mqttTopic, ping);
            setTimeout(() => {
                if (!failed) {
                    done();
                }
            }, 3000);
        });
    });

    it("should not be able to do mqtt over WebSocket on root path", (done) => {
        mqttServ.attachHttpServer(server, mqttPath);
        server.listen(port, () => {
            const client = mqtt.connect(`ws://localhost:${port}`);
            client.subscribe(mqttTopic);
            let failed = false;
            client.on("message", (topic, payload) => {
                failed = true;
                done(failed);
            });
            client.publish(mqttTopic, ping);
            setTimeout(() => {
                if (!failed) {
                    done();
                }
            }, 2000);
        });
    });
});

describe("mosca.Server - Websocket and Mqtt-over-WS attached to the same http server", () => {
    let server;
    let mqttServ;
    let wss;

    beforeEach(() => {
        server = adone.std.http.createServer();
        mqttServ = new adone.net.mqtt.server.Server({ interfaces: [] });

        wss = new adone.net.ws.Server({
            server,
            path,
            perMessageDeflate: false
        });
    });

    afterEach(() => {
        server.close();
    });

    it("ws client should not connect when mqtt is attached to http server without path", (done) => {
        mqttServ.attachHttpServer(server);
        server.listen(port, () => {
            const ws = new adone.net.ws.Client(`ws://localhost:${port}${path}`, {
                perMessageDeflate: false
            });

            ws.on("error", (e) => {
                expect(e).to.not.be.undefined();
                done();
            });
        });
    });

    it.skip("ws client should be able to connect when specific path is used", (done) => {
        mqttServ.attachHttpServer(server, mqttPath);
        wss.on("connection", (conn) => {
            conn.on("message", (msg) => {
                expect(msg).to.equal(ping);
                conn.send(pong);
            });
        });

        server.listen(port, () => {
            const ws = new adone.net.ws.Client(`ws://localhost:${port}${path}`, {
                perMessageDeflate: false
            });

            ws.on("open", () => {
                ws.send(ping);
            });

            ws.on("message", (msg) => {
                expect(msg).to.equal(pong);
                done();
            });
        });
    });

    it.skip("mqtt client should be able to connect as well", (done) => {
        mqttServ.attachHttpServer(server, mqttPath);
        server.listen(port, () => {
            const client = mqtt.connect(`ws://localhost:${port}${mqttPath}`);
            client.subscribe(mqttTopic);
            client.on("message", (topic, payload) => {
                expect(topic).to.equal(mqttTopic);
                expect(payload.toString()).to.equal(ping);
                done();
            });
            client.publish(mqttTopic, ping);
        });
    });

    it.skip("both ws and mqtt client should be able to connect at the same time", (done) => {
        mqttServ.attachHttpServer(server, mqttPath);
        wss.on("connection", (conn) => {
            conn.on("message", (msg) => {
                expect(msg).to.equal(ping);
                conn.send(pong);
            });
        });

        server.listen(port, () => {
            const client = mqtt.connect(`ws://localhost:${port}${mqttPath}`);
            const ws = new adone.net.ws.Client(`ws://localhost:${port}${path}`, {
                perMessageDeflate: false
            });

            client.on("connect", () => {
                client.subscribe(mqttTopic);
                setTimeout(() => { // wait for ws to connect
                    ws.send(ping);
                }, 2000);
            });

            ws.on("message", (msg) => {
                expect(msg).to.equal(pong);
                client.publish(mqttTopic, ping);
            });

            client.on("message", (topic, payload) => {
                expect(topic).to.equal(mqttTopic);
                expect(payload.toString()).to.equal(ping);
                done();
            });
        });
    });
});
