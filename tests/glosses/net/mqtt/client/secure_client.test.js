const { std: { path, fs } } = adone;
const abstractClientTests = require("./abstract_client");
const port = 9899;
const KEY = path.join(__dirname, "helpers", "tls-key.pem");
const CERT = path.join(__dirname, "helpers", "tls-cert.pem");
const WRONG_CERT = path.join(__dirname, "helpers", "wrong-cert.pem");
import { MqttSecureServer } from "./server";

const server = new MqttSecureServer({
    key: fs.readFileSync(KEY),
    cert: fs.readFileSync(CERT)
}, (client) => {
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
            /* jshint -W027 */
            /* eslint default-case:0 */
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
            /* jshint +W027 */
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

describe("net", "mqtt", "client", "MqttSecureClient", () => {
    const config = { protocol: "mqtts", port, rejectUnauthorized: false };
    abstractClientTests(server, config);

    describe("with secure parameters", () => {
        it("should validate successfully the CA", (done) => {
            const client = adone.net.mqtt.client.connect({
                protocol: "mqtts",
                port,
                ca: [fs.readFileSync(CERT)],
                rejectUnauthorized: true
            });

            client.on("error", (err) => {
                done(err);
            });

            server.once("connect", () => {
                done();
            });
        });

        it("should validate unsuccessfully the CA", (done) => {
            const client = adone.net.mqtt.client.connect({
                protocol: "mqtts",
                port,
                ca: [fs.readFileSync(WRONG_CERT)],
                rejectUnauthorized: true
            });

            client.once("error", () => {
                done();
                client.end();
                client.on("error", () => { });
            });
        });

        it("should emit close on TLS error", (done) => {
            const client = adone.net.mqtt.client.connect({
                protocol: "mqtts",
                port,
                ca: [fs.readFileSync(WRONG_CERT)],
                rejectUnauthorized: true
            });

            client.on("error", () => { });

            // TODO node v0.8.x emits multiple close events
            client.once("close", () => {
                done();
            });
        });
    });
});
