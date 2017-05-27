const Connection = require("mqtt-connection");
// const abstractClientTests = require("./abstract_client"); !!! Temporarily disabled !!!
const port = 9999;
const server = adone.std.http.createServer();

const attachWebsocketServer = (wsServer) => {
    const wss = new adone.net.ws.Server({ server: wsServer, perMessageDeflate: false });

    wss.on("connection", (ws) => {
        const stream = adone.net.ws.stream.createClient(ws);
        const connection = new Connection(stream);

        wsServer.emit("client", connection);
        stream.on("error", () => { });
        connection.on("error", () => { });
    });

    return wsServer;
};

attachWebsocketServer(server);

server.on("client", (client) => {
    client.on("connect", (packet) => {
        if (packet.clientId === "invalid") {
            client.connack({ returnCode: 2 });
        } else {
            server.emit("connect", client);
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
}).listen(port);

describe("Websocket Client", () => {
    const baseConfig = { protocol: "ws", port };

    const makeOptions = (custom) => Object.assign({}, baseConfig, custom || {});

    it("should use mqtt as the protocol by default", (done) => {
        server.once("client", (client) => {
            assert.equal(client.stream.socket.protocol, "mqtt");
        });
        adone.net.mqtt.client.connect(makeOptions()).on("connect", function () {
            this.end(true, done);
        });
    });

    it("should be able transform the url (for e.g. to sign it)", (done) => {
        const baseUrl = "ws://localhost:9999/mqtt";
        const sig = "?AUTH=token";
        const expected = baseUrl + sig;
        let actual;
        const opts = makeOptions({
            path: "/mqtt",
            transformWsUrl(url, opt, client) {
                assert.equal(url, baseUrl);
                assert.strictEqual(opt, opts);
                assert.strictEqual(client.options, opts);
                assert.strictEqual(typeof opt.transformWsUrl, "function");
                assert(client instanceof adone.net.mqtt.client.Client);
                url += sig;
                actual = url;
                return url;
            }
        });
        adone.net.mqtt.client.connect(opts).on("connect", function () {
            assert.equal(this.stream.socket.url, expected);
            assert.equal(actual, expected);
            this.end(true, done);
        });
    });

    it("should use mqttv3.1 as the protocol if using v3.1", (done) => {
        server.once("client", (client) => {
            assert.equal(client.stream.socket.protocol, "mqttv3.1");
        });

        const opts = makeOptions({
            protocolId: "MQIsdp",
            protocolVersion: 3
        });

        adone.net.mqtt.client.connect(opts).on("connect", function () {
            this.end(true, done);
        });
    });

    // abstractClientTests(server, makeOptions());  !!! Temporarily disabled !!!
});
