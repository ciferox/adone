describe("database", "mysql", "functional", "auth switch", () => {
    const { database: { mysql } } = adone;
    const {
        command: { Command },
        packet: {
            Handshake, HandshakeResponse,
            AuthSwitchRequest, AuthSwitchResponse, AuthSwitchRequestMoreData
        }
    } = adone.private(mysql);

    const connectAttributes = { foo: "bar", baz: "foo" };
    let count = 0;

    class TestAuthSwitchHandshake extends Command {
        constructor(args) {
            super();
            this.args = args;
        }

        start(packet, connection) {
            const serverHelloPacket = new Handshake({
                protocolVersion: 10,
                serverVersion: "node.js rocks",
                connectionId: 1234,
                statusFlags: 2,
                characterSet: 8,
                capabilityFlags: 0xffffff
            });
            this.serverHello = serverHelloPacket;
            serverHelloPacket.setScrambleData(() => {
                connection.writePacket(serverHelloPacket.toPacket(0));
            });
            return TestAuthSwitchHandshake.prototype.readClientReply;
        }

        readClientReply(packet, connection) {
            const clientHelloReply = HandshakeResponse.fromPacket(packet);

            assert.equal(clientHelloReply.user, "test_user");
            assert.equal(clientHelloReply.database, "test_database");
            assert.equal(clientHelloReply.authPluginName, "mysql_native_password");
            assert.deepEqual(clientHelloReply.connectAttributes, connectAttributes);

            const asr = new AuthSwitchRequest(this.args);
            connection.writePacket(asr.toPacket());
            return TestAuthSwitchHandshake.prototype.readClientAuthSwitchResponse;
        }

        readClientAuthSwitchResponse(packet, connection) {
            AuthSwitchResponse.fromPacket(packet);

            count++;
            if (count < 10) {
                const asrmd = new AuthSwitchRequestMoreData(Buffer.from(`hahaha ${count}`));
                connection.writePacket(asrmd.toPacket());
                return TestAuthSwitchHandshake.prototype.readClientAuthSwitchResponse;
            }
            connection.writeOk();
            return TestAuthSwitchHandshake.prototype.dispatchCommands;

        }

        dispatchCommands(packet, connection) {
            // Quit command here
            // TODO: assert it's actually Quit
            connection.end();
            return TestAuthSwitchHandshake.prototype.dispatchCommands;
        }
    }

    it("should work", async () => {
        const server = mysql.createServer((conn) => {
            conn.serverConfig = {};
            conn.serverConfig.encoding = "cesu8";
            conn.addCommand(new TestAuthSwitchHandshake({
                pluginName: "auth_test_plugin",
                pluginData: Buffer.from("f\{tU-{K@BhfHt/-4^Z,")
            }));
        });
        await new Promise((resolve) => server.listen(0, resolve));

        let fullAuthExchangeDone = false;

        const makeSwitchHandler = function () {
            let count = 0;
            return function (data, cb) {
                if (count == 0) {
                    assert.equal(data.pluginName, "auth_test_plugin");
                } else {
                    assert.equal(data.pluginData.toString(), `hahaha ${count}`);
                }

                if (count == 9) {
                    fullAuthExchangeDone = true;
                }
                count++;
                cb(null, `some data back${count}`);
            };
        };

        const { port } = server.address();

        const conn = mysql.createConnection({
            user: "test_user",
            password: "test",
            database: "test_database",
            port,
            authSwitchHandler: makeSwitchHandler(),
            connectAttributes,
            promise: false
        });
        const handshake = await new Promise((resolve) => conn.once("connect", resolve));
        expect(handshake.serverVersion).to.be.equal("node.js rocks");
        expect(handshake.connectionId).to.be.equal(1234);
        conn.end();
        server.close();
    });
});
