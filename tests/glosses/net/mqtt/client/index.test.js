const { std: { fs, path } } = adone;
const { connect, Client } = adone.net.mqtt.client;

describe("net", "mqtt", "client", () => {
    describe("#connect", () => {
        it("should return an MqttClient when connect is called with mqtt:/ url", () => {
            const c = connect("mqtt://localhost:1883");

            assert.instanceOf(c, Client);
        });

        it("should throw an error when called with no protocol specified", () => {
            assert.throws(() => connect("foo.bar.com"), "Missing protocol");
        });

        it("should throw an error when called with no protocol specified - with options", () => {
            assert.throws(() => connect("tcp://foo.bar.com", { protocol: null }), "Missing protocol");
        });

        it("should return an MqttClient with username option set", () => {
            const c = connect("mqtt://user:pass@localhost:1883");

            assert.instanceOf(c, Client);
            assert.propertyVal(c.options, "username", "user");
            assert.propertyVal(c.options, "password", "pass");
        });

        it("should return an MqttClient with username and password options set", () => {
            const c = connect("mqtt://user@localhost:1883");

            assert.instanceOf(c, Client);
            assert.propertyVal(c.options, "username", "user");
        });

        it("should return an MqttClient with the clientid option set", () => {
            const c = connect("mqtt://user@localhost:1883?clientId=123");

            assert.instanceOf(c, Client);
            assert.propertyVal(c.options, "clientId", "123");
        });

        it("should return an MqttClient when connect is called with tcp:/ url", () => {
            const c = connect("tcp://localhost");

            assert.instanceOf(c, Client);
        });

        it("should return an MqttClient with correct host when called with a host and port", () => {
            const c = connect("tcp://user:pass@localhost:1883");

            assert.propertyVal(c.options, "hostname", "localhost");
            assert.propertyVal(c.options, "port", 1883);
        });

        const sslOpts = {
            keyPath: path.join(__dirname, "helpers", "private-key.pem"),
            certPath: path.join(__dirname, "helpers", "public-cert.pem"),
            caPaths: [path.join(__dirname, "helpers", "public-cert.pem")]
        };

        it("should return an MqttClient when connect is called with mqtts:/ url", () => {
            const c = connect("mqtts://localhost", sslOpts);

            assert.propertyVal(c.options, "protocol", "mqtts");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });

        it("should return an MqttClient when connect is called with ssl:/ url", () => {
            const c = connect("ssl://localhost", sslOpts);

            assert.propertyVal(c.options, "protocol", "ssl");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });

        it("should return an MqttClient when connect is called with ws:/ url", () => {
            const c = connect("ws://localhost", sslOpts);

            assert.property(c.options, "protocol", "ws");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });

        it("should return an MqttClient when connect is called with wss:/ url", () => {
            const c = connect("wss://localhost", sslOpts);

            assert.property(c.options, "protocol", "wss");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });

        const sslOpts2 = {
            key: fs.readFileSync(path.join(__dirname, "helpers", "private-key.pem")),
            cert: fs.readFileSync(path.join(__dirname, "helpers", "public-cert.pem")),
            ca: [fs.readFileSync(path.join(__dirname, "helpers", "public-cert.pem"))]
        };

        it("should throw an error when it is called with cert and key set but no protocol specified", () => {
            // to do rewrite wrap function
            assert.throws(() => {
                const c = connect(sslOpts2);
                c.end();
            });
            
        });

        it("should throw an error when it is called with cert and key set and protocol other than allowed: mqtt,mqtts,ws,wss", () => {
            assert.throws(() => {
                sslOpts2.protocol = "UNKNOWNPROTOCOL";
                const c = connect(sslOpts2);
                c.end();
            });
        });

        it("should return a MqttClient with mqtts set when connect is called key and cert set and protocol mqtt", () => {
            sslOpts2.protocol = "mqtt";
            const c = connect(sslOpts2);

            assert.propertyVal(c.options, "protocol", "mqtts");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });

        it("should return a MqttClient with mqtts set when connect is called key and cert set and protocol mqtts", () => {
            sslOpts2.protocol = "mqtts";
            const c = connect(sslOpts2);

            assert.propertyVal(c.options, "protocol", "mqtts");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });

        it("should return a MqttClient with wss set when connect is called key and cert set and protocol ws", () => {
            sslOpts2.protocol = "ws";
            const c = connect(sslOpts2);

            assert.propertyVal(c.options, "protocol", "wss");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });

        it("should return a MqttClient with wss set when connect is called key and cert set and protocol wss", () => {
            sslOpts2.protocol = "wss";
            const c = connect(sslOpts2);

            assert.propertyVal(c.options, "protocol", "wss");

            c.on("error", () => { });

            assert.instanceOf(c, Client);
        });
    });
});
