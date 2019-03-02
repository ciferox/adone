module.exports = function (server, config) {
    const connect = (opts = {}) => {
        opts = Object.assign({}, config, opts);
        return adone.net.mqtt.client.connect(opts);
    };

    describe("closing", () => {
        it("should emit close if stream closes", (done) => {
            const client = connect();

            client.once("connect", () => {
                client.stream.end();
            });
            client.once("close", () => {
                client.end();
                done();
            });
        });

        it("should mark the client as disconnected", (done) => {
            const client = connect();

            client.once("close", () => {
                client.end();
                if (!client.connected) {
                    done();
                } else {
                    done(new Error("Not marked as disconnected"));
                }
            });
            client.once("connect", () => {
                client.stream.end();
            });
        });

        it("should stop ping timer if stream closes", (done) => {
            const client = connect();

            client.once("close", () => {
                assert.notExists(client.pingTimer);
                client.end();
                done();
            });

            client.once("connect", () => {
                assert.exists(client.pingTimer);
                client.stream.end();
            });
        });

        it("should emit close after end called", (done) => {
            const client = connect();

            client.once("close", () => {
                done();
            });

            client.once("connect", () => {
                client.end();
            });
        });

        it("should return `this` if end called twice", (done) => {
            const client = connect();

            client.once("connect", () => {
                client.end();
                const value = client.end();
                if (value === client) {
                    done();
                } else {
                    done(new Error("Not returning client."));
                }
            });
        });

        it("should stop ping timer after end called", (done) => {
            const client = connect();

            client.once("connect", () => {
                assert.exists(client.pingTimer);
                client.end();
                assert.notExists(client.pingTimer);
                done();
            });
        });
    });

    describe("connecting", () => {
        it("should connect to the broker", (done) => {
            const client = connect();
            client.on("error", done);

            server.once("client", () => {
                client.end();
                done();
            });
        });

        it("should send a default client id", (done) => {
            const client = connect();
            client.on("error", done);

            server.once("client", (serverClient) => {
                serverClient.once("connect", (packet) => {
                    assert.match(packet.clientId, /mqttjs.*/);
                    serverClient.disconnect();
                    done();
                });
            });
        });

        it("should send be clean by default", (done) => {
            const client = connect();
            client.on("error", done);

            server.once("client", (serverClient) => {
                serverClient.once("connect", (packet) => {
                    assert.isTrue(packet.clean);
                    serverClient.disconnect();
                    done();
                });
            });
        });

        it("should connect with the given client id", (done) => {
            const client = connect({ clientId: "testclient" });
            client.on("error", (err) => {
                throw err;
            });

            server.once("client", (serverClient) => {
                serverClient.once("connect", (packet) => {
                    assert.match(packet.clientId, /testclient/);
                    serverClient.disconnect();
                    done();
                });
            });
        });

        it("should connect with the client id and unclean state", (done) => {
            const client = connect({ clientId: "testclient", clean: false });
            client.on("error", (err) => {
                throw err;
            });

            server.once("client", (serverClient) => {
                serverClient.once("connect", (packet) => {
                    assert.match(packet.clientId, /testclient/);
                    assert.isFalse(packet.clean);
                    serverClient.disconnect();
                    done();
                });
            });
        });

        it("should require a clientId with clean=false", (done) => {
            try {
                const client = connect({ clean: false });
                client.on("error", (err) => {
                    done(err);
                    // done(new Error('should have thrown'));
                });
            } catch (err) {
                done();
            }
        });

        it("should default to localhost", (done) => {
            const client = connect({ clientId: "testclient" });
            client.on("error", (err) => {
                throw err;
            });

            server.once("client", (serverClient) => {
                serverClient.once("connect", (packet) => {
                    assert.match(packet.clientId, /testclient/);
                    serverClient.disconnect();
                    done();
                });
            });
        });

        it("should emit connect", (done) => {
            const client = connect();
            client.once("connect", () => {
                client.end();
                done();
            });
            client.once("error", done);
        });

        it("should provide connack packet with connect event", (done) => {
            server.once("client", (serverClient) => {
                serverClient.connack({ returnCode: 0, sessionPresent: true });

                server.once("client", (serverClient) => {
                    serverClient.connack({ returnCode: 0, sessionPresent: false });
                });
            });

            const client = connect();
            client.once("connect", (packet) => {
                assert.equal(packet.sessionPresent, true);
                client.once("connect", (packet) => {
                    assert.equal(packet.sessionPresent, false);
                    client.end();
                    done();
                });
            });
        });

        it("should mark the client as connected", (done) => {
            const client = connect();
            client.once("connect", () => {
                client.end();
                if (client.connected) {
                    done();
                } else {
                    done(new Error("Not marked as connected"));
                }
            });
        });

        it("should emit error", (done) => {
            const client = connect({ clientId: "invalid" });
            client.once("connect", () => {
                done(new Error("Should not emit connect"));
            });
            client.once("error", (error) => {
                assert.equal(error.code, 2); // code for clientID identifer rejected
                client.end();
                done();
            });
        });

        it("should have different client ids", (done) => {
            const client1 = connect();
            const client2 = connect();

            assert.notEqual(client1.options.clientId, client2.options.clientId);
            client1.end(true);
            client2.end(true);
            setImmediate(done);
        });
    });

    describe("handling offline states", () => {
        it("should emit offline events once when the client transitions from connected states to disconnected ones", (done) => {
            const client = connect({ reconnectPeriod: 20 });

            client.on("connect", function () {
                this.stream.end();
            });

            client.on("offline", () => {
                client.end(true, done);
            });
        });

        it("should emit offline events once when the client (at first) can NOT connect to servers", (done) => {
            // fake a port
            const client = connect({ reconnectPeriod: 20, port: 4557 });

            client.on("offline", () => {
                client.end(true, done);
            });
        });
    });

    describe("topic validations when subscribing", () => {
        it("should be ok for well-formated topics", (done) => {
            const client = connect();
            client.subscribe(
                [
                    "+", "+/event", "event/+", "#", "event/#", "system/event/+",
                    "system/+/event", "system/registry/event/#", "system/+/event/#",
                    "system/registry/event/new_device", "system/+/+/new_device"
                ],
                (err) => {
                    client.end();
                    if (err) {
                        return done(new Error(err));
                    }
                    done();
                }
            );
        });

        it("should return an error (via callbacks) for topic #/event", (done) => {
            const client = connect();
            client.subscribe(["#/event", "event#", "event+"], (err) => {
                client.end();
                if (err) {
                    return done();
                }
                done(new Error("Validations do NOT work"));
            });
        });

        it("should return an empty array for duplicate subs", (done) => {
            const client = connect();
            client.subscribe("event", (err, granted1) => {
                if (err) {
                    return done();
                }
                client.subscribe("event", (err, granted2) => {
                    if (err) {
                        return done();
                    }
                    assert.empty(granted2);
                    done();
                });
            });
        });

        it("should return an error (via callbacks) for topic #/event", (done) => {
            const client = connect();
            client.subscribe("#/event", (err) => {
                client.end();
                if (err) {
                    return done();
                }
                done(new Error("Validations do NOT work"));
            });
        });

        it("should return an error (via callbacks) for topic event#", (done) => {
            const client = connect();
            client.subscribe("event#", (err) => {
                client.end();
                if (err) {
                    return done();
                }
                done(new Error("Validations do NOT work"));
            });
        });

        it("should return an error (via callbacks) for topic system/#/event", (done) => {
            const client = connect();
            client.subscribe("system/#/event", (err) => {
                client.end();
                if (err) {
                    return done();
                }
                done(new Error("Validations do NOT work"));
            });
        });

        it("should return an error (via callbacks) for empty topic list", (done) => {
            const client = connect();
            client.subscribe([], (err) => {
                client.end();
                if (err) {
                    return done();
                }
                done(new Error("Validations do NOT work"));
            });
        });

        it("should return an error (via callbacks) for topic system/+/#/event", (done) => {
            const client = connect();
            client.subscribe("system/+/#/event", (err) => {
                client.end();
                if (err) {
                    return done();
                }
                done(new Error("Validations do NOT work"));
            });
        });
    });

    describe("offline messages", () => {
        it("should queue message until connected", (done) => {
            const client = connect();

            client.publish("test", "test");
            client.subscribe("test");
            client.unsubscribe("test");
            assert.equal(client.queue.length, 3);

            client.once("connect", () => {
                assert.equal(client.queue.length, 0);
                client.end(true, done);
            });
        });

        it("should not queue qos 0 messages if queueQoSZero is false", (done) => {
            const client = connect({ queueQoSZero: false });

            client.publish("test", "test", { qos: 0 });
            assert.equal(client.queue.length, 0);
            client.end(true, done);
        });

        it("should not queue qos != 0 messages", (done) => {
            const client = connect({ queueQoSZero: false });

            client.publish("test", "test", { qos: 1 });
            client.publish("test", "test", { qos: 2 });
            client.subscribe("test");
            client.unsubscribe("test");
            assert.equal(client.queue.length, 2);
            client.end(true, done);
        });

        it("should call cb if an outgoing QoS 0 message is not sent", (done) => {
            const client = connect({ queueQoSZero: false });

            client.publish("test", "test", { qos: 0 }, () => {
                client.end(true, done);
            });
        });

        if (!process.env.TRAVIS) {
            it("should delay ending up until all inflight messages are delivered", (done) => {
                const client = connect();

                client.on("connect", () => {
                    client.subscribe("test", () => {
                        done();
                    });
                    client.publish("test", "test", () => {
                        client.end();
                    });
                });
            });

            it("wait QoS 1 publish messages", (done) => {
                const client = connect();

                client.on("connect", () => {
                    client.subscribe("test");
                    client.publish("test", "test", { qos: 1 }, () => {
                        client.end();
                    });
                    client.on("message", () => {
                        done();
                    });
                });

                server.once("client", (serverClient) => {
                    serverClient.on("subscribe", () => {
                        serverClient.on("publish", (packet) => {
                            serverClient.publish(packet);
                        });
                    });
                });
            });

            it("does not wait acks when force-closing", (done) => {
                // non-running broker
                const client = connect("mqtt://localhost:8993");

                client.publish("test", "test", { qos: 1 });
                client.end(true, done);
            });
        }
    });

    describe("publishing", () => {
        it("should publish a message (offline)", (done) => {
            const client = connect();
            const payload = "test";
            const topic = "test";

            client.publish(topic, payload);

            server.once("client", (serverClient) => {
                serverClient.once("publish", (packet) => {
                    assert.equal(packet.topic, topic);
                    assert.equal(packet.payload.toString(), payload);
                    assert.equal(packet.qos, 0);
                    assert.equal(packet.retain, false);
                    client.end();
                    done();
                });
            });
        });

        it("should publish a message (online)", (done) => {
            const client = connect();
            const payload = "test";
            const topic = "test";

            client.on("connect", () => {
                client.publish(topic, payload);
            });

            server.once("client", (serverClient) => {
                serverClient.once("publish", (packet) => {
                    assert.equal(packet.topic, topic);
                    assert.equal(packet.payload.toString(), payload);
                    assert.equal(packet.qos, 0);
                    assert.equal(packet.retain, false);
                    client.end();
                    done();
                });
            });
        });

        it("should emit a packetsend event", (done) => {
            const client = connect();
            const payload = "test_payload";
            const testTopic = "testTopic";

            client.on("packetsend", (packet) => {
                if (packet.cmd === "publish") {
                    assert.equal(packet.qos, 0);
                    assert.equal(packet.topic, testTopic);
                    assert.equal(packet.payload, payload);
                    assert.equal(packet.retain, false);
                    client.end();
                    done();
                }
            });

            client.publish(testTopic, payload);
        });

        it("should accept options", (done) => {
            const client = connect();
            const payload = "test";
            const topic = "test";
            const opts = {
                retain: true,
                qos: 1
            };

            client.once("connect", () => {
                client.publish(topic, payload, opts);
            });

            server.once("client", (serverClient) => {
                serverClient.once("publish", (packet) => {
                    assert.equal(packet.topic, topic);
                    assert.equal(packet.payload.toString(), payload);
                    assert.equal(packet.qos, opts.qos, "incorrect qos");
                    assert.equal(packet.retain, opts.retain, "incorrect ret");
                    assert.equal(packet.dup, false, "incorrect dup");
                    client.end();
                    done();
                });
            });
        });

        it("should publish with the default options for an empty parameter", (done) => {
            const client = connect();
            const payload = "test";
            const topic = "test";
            const defaultOpts = { qos: 0, retain: false, dup: false };

            client.once("connect", () => {
                client.publish(topic, payload, {});
            });

            server.once("client", (serverClient) => {
                serverClient.once("publish", (packet) => {
                    assert.equal(packet.topic, topic);
                    assert.equal(packet.payload.toString(), payload);
                    assert.equal(packet.qos, defaultOpts.qos, "incorrect qos");
                    assert.equal(packet.retain, defaultOpts.retain, "incorrect ret");
                    assert.equal(packet.dup, defaultOpts.dup, "incorrect dup");
                    client.end();
                    done();
                });
            });
        });

        it('should mark a message as  duplicate when "dup" option is set', (done) => {
            const client = connect();
            const payload = "duplicated-test";
            const topic = "test";
            const opts = {
                retain: true,
                qos: 1,
                dup: true
            };

            client.once("connect", () => {
                client.publish(topic, payload, opts);
            });

            server.once("client", (serverClient) => {
                serverClient.once("publish", (packet) => {
                    assert.equal(packet.topic, topic);
                    assert.equal(packet.payload.toString(), payload);
                    assert.equal(packet.dup, opts.dup, "incorrect dup");
                    client.end();
                    done();
                });
            });
        });

        it("should fire a callback (qos 0)", (done) => {
            const client = connect();

            client.once("connect", () => {
                client.publish("a", "b", () => {
                    client.end();
                    done();
                });
            });
        });

        it("should fire a callback (qos 1)", (done) => {
            const client = connect();
            const opts = { qos: 1 };

            client.once("connect", () => {
                client.publish("a", "b", opts, () => {
                    client.end();
                    done();
                });
            });
        });

        it("should fire a callback (qos 2)", (done) => {
            const client = connect();
            const opts = { qos: 2 };

            client.once("connect", () => {
                client.publish("a", "b", opts, () => {
                    client.end();
                    done();
                });
            });
        });

        it("should support UTF-8 characters in topic", (done) => {
            const client = connect();

            client.once("connect", () => {
                client.publish("中国", "hello", () => {
                    client.end();
                    done();
                });
            });
        });

        it("should support UTF-8 characters in payload", (done) => {
            const client = connect();

            client.once("connect", () => {
                client.publish("hello", "中国", () => {
                    client.end();
                    done();
                });
            });
        });

        it("Publish 10 QoS 2 and receive them", (done) => {
            const client = connect();
            let count = 0;

            client.on("connect", () => {
                client.subscribe("test");
                client.publish("test", "test", { qos: 2 });
            });

            client.on("message", () => {
                if (count >= 10) {
                    client.end();
                    done();
                } else {
                    client.publish("test", "test", { qos: 2 });
                }
            });

            server.once("client", (serverClient) => {
                serverClient.on("offline", () => {
                    client.end();
                    done("error went offline... didnt see this happen");
                });

                serverClient.on("subscribe", () => {
                    serverClient.on("publish", (packet) => {
                        serverClient.publish(packet);
                    });
                });

                serverClient.on("pubrel", () => {
                    count++;
                });
            });
        });
    });

    describe("unsubscribing", () => {
        it("should send an unsubscribe packet (offline)", (done) => {
            const client = connect();

            client.unsubscribe("test");

            server.once("client", (serverClient) => {
                serverClient.once("unsubscribe", (packet) => {
                    assert.include(packet.unsubscriptions, "test");
                    client.end();
                    done();
                });
            });
        });

        it("should send an unsubscribe packet", (done) => {
            const client = connect();
            const topic = "topic";

            client.once("connect", () => {
                client.unsubscribe(topic);
            });

            server.once("client", (serverClient) => {
                serverClient.once("unsubscribe", (packet) => {
                    assert.include(packet.unsubscriptions, topic);
                    client.end();
                    done();
                });
            });
        });

        it("should emit a packetsend event", (done) => {
            const client = connect();
            const testTopic = "testTopic";

            client.once("connect", () => {
                client.subscribe(testTopic);
            });

            client.on("packetsend", (packet) => {
                if (packet.cmd === "subscribe") {
                    client.end();
                    done();
                }
            });
        });

        it("should emit a packetreceive event", (done) => {
            const client = connect();
            const testTopic = "testTopic";

            client.once("connect", () => {
                client.subscribe(testTopic);
            });

            client.on("packetreceive", (packet) => {
                if (packet.cmd === "suback") {
                    client.end();
                    done();
                }
            });
        });

        it("should accept an array of unsubs", (done) => {
            const client = connect();
            const topics = ["topic1", "topic2"];

            client.once("connect", () => {
                client.unsubscribe(topics);
            });

            server.once("client", (serverClient) => {
                serverClient.once("unsubscribe", (packet) => {
                    assert.sameMembers(packet.unsubscriptions, topics);
                    done();
                });
            });
        });

        it("should fire a callback on unsuback", (done) => {
            const client = connect();
            const topic = "topic";

            client.once("connect", () => {
                client.unsubscribe(topic, done);
            });

            server.once("client", (serverClient) => {
                serverClient.once("unsubscribe", (packet) => {
                    serverClient.unsuback(packet);
                    client.end();
                });
            });
        });

        it("should unsubscribe from a chinese topic", (done) => {
            const client = connect();
            const topic = "中国";

            client.once("connect", () => {
                client.unsubscribe(topic);
            });

            server.once("client", (serverClient) => {
                serverClient.once("unsubscribe", (packet) => {
                    assert.include(packet.unsubscriptions, topic);
                    client.end();
                    done();
                });
            });
        });
    });

    describe("keepalive", () => {
        let clock;

        before(() => {
            clock = fakeClock.install();
        });

        after(() => {
            clock.uninstall();
        });

        it("should checkPing at keepalive interval", (done) => {
            const interval = 3;
            const client = connect({ keepalive: interval });

            client._checkPing = spy();

            client.once("connect", () => {
                clock.tick(interval * 1000);
                expect(client._checkPing).to.have.been.calledOnce();

                clock.tick(interval * 1000);
                expect(client._checkPing).to.have.been.calledTwice();

                clock.tick(interval * 1000);
                expect(client._checkPing).to.have.been.calledThrice();

                client.end();
                done();
            });
        });

        it("should not checkPing if publishing at a higher rate than keepalive", (done) => {
            const intervalMs = 3000;
            const client = connect({ keepalive: intervalMs / 1000 });

            client._checkPing = spy();

            client.once("connect", () => {
                client.publish("foo", "bar");
                clock.tick(intervalMs - 1);
                client.publish("foo", "bar");
                clock.tick(2);
                expect(client._checkPing).not.to.have.been.called();
                client.end();
                done();
            });
        });

        it("should checkPing if publishing at a higher rate than keepalive and reschedulePings===false", (done) => {
            const intervalMs = 3000;
            const client = connect({
                keepalive: intervalMs / 1000,
                reschedulePings: false
            });

            client._checkPing = spy();

            client.once("connect", () => {
                client.publish("foo", "bar");
                clock.tick(intervalMs - 1);
                client.publish("foo", "bar");
                clock.tick(2);
                expect(client._checkPing).to.have.been.calledOnce();
                client.end();
                done();
            });
        });
    });

    describe("pinging", () => {
        it("should set a ping timer", (done) => {
            const client = connect({ keepalive: 3 });
            client.once("connect", () => {
                assert.exists(client.pingTimer);
                client.end();
                done();
            });
        });

        it("should not set a ping timer keepalive=0", (done) => {
            const client = connect({ keepalive: 0 });
            client.on("connect", () => {
                assert.notExists(client.pingTimer);
                client.end();
                done();
            });
        });

        it("should reconnect if pingresp is not sent", (done) => {
            const client = connect({ keepalive: 1, reconnectPeriod: 100 });

            // Fake no pingresp being send by stubbing the _handlePingresp function
            client._handlePingresp = function () { };

            client.once("connect", () => {
                client.once("connect", () => {
                    client.end();
                    done();
                });
            });
        });

        it("should not reconnect if pingresp is successful", (done) => {
            const client = connect({ keepalive: 100 });
            client.once("close", () => {
                done(new Error("Client closed connection"));
            });
            setTimeout(done, 1000);
        });

        it("should defer the next ping when sending a control packet", (done) => {
            const client = connect({ keepalive: 1 });

            client.once("connect", () => {
                client._checkPing = spy();

                client.publish("foo", "bar");
                setTimeout(() => {
                    assert.equal(client._checkPing.callCount, 0);
                    client.publish("foo", "bar");

                    setTimeout(() => {
                        assert.equal(client._checkPing.callCount, 0);
                        client.publish("foo", "bar");

                        setTimeout(() => {
                            assert.equal(client._checkPing.callCount, 0);
                            done();
                        }, 75);
                    }, 75);
                }, 75);
            });
        });
    });

    describe("subscribing", () => {
        it("should send a subscribe message (offline)", (done) => {
            const client = connect();

            client.subscribe("test");

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", () => {
                    done();
                });
            });
        });

        it("should send a subscribe message", (done) => {
            const client = connect();
            const topic = "test";

            client.once("connect", () => {
                client.subscribe(topic);
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", (packet) => {
                    assert.deepInclude(packet.subscriptions, {
                        topic,
                        qos: 0
                    });
                    done();
                });
            });
        });

        it("should emit a packetsend event", (done) => {
            const client = connect();
            const testTopic = "testTopic";

            client.once("connect", () => {
                client.subscribe(testTopic);
            });

            client.on("packetsend", (packet) => {
                if (packet.cmd === "subscribe") {
                    done();
                }
            });
        });

        it("should emit a packetreceive event", (done) => {
            const client = connect();
            const testTopic = "testTopic";

            client.once("connect", () => {
                client.subscribe(testTopic);
            });

            client.on("packetreceive", (packet) => {
                if (packet.cmd === "suback") {
                    done();
                }
            });
        });

        it("should accept an array of subscriptions", (done) => {
            const client = connect();
            const subs = ["test1", "test2"];

            client.once("connect", () => {
                client.subscribe(subs);
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", (packet) => {
                    // i.e. [{topic: 'a', qos: 0}, {topic: 'b', qos: 0}]
                    const expected = subs.map((i) => {
                        return { topic: i, qos: 0 };
                    });

                    assert.deepEqual(packet.subscriptions, expected);
                    done();
                });
            });
        });

        it("should accept an hash of subscriptions", (done) => {
            const client = connect();
            const topics = {
                test1: 0,
                test2: 1
            };

            client.once("connect", () => {
                client.subscribe(topics);
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", (packet) => {
                    let k;
                    const expected = [];

                    for (k in topics) {
                        if (topics.hasOwnProperty(k)) {
                            expected.push({
                                topic: k,
                                qos: topics[k]
                            });
                        }
                    }

                    assert.deepEqual(packet.subscriptions, expected);
                    done();
                });
            });
        });

        it("should accept an options parameter", (done) => {
            const client = connect();
            const topic = "test";
            const opts = { qos: 1 };

            client.once("connect", () => {
                client.subscribe(topic, opts);
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", (packet) => {
                    const expected = [{
                        topic,
                        qos: 1
                    }];

                    assert.deepEqual(packet.subscriptions, expected);
                    done();
                });
            });
        });

        it("should subscribe with the default options for an empty options parameter", (done) => {
            const client = connect();
            const topic = "test";
            const defaultOpts = { qos: 0 };

            client.once("connect", () => {
                client.subscribe(topic, {});
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", (packet) => {
                    assert.deepInclude(packet.subscriptions, {
                        topic,
                        qos: defaultOpts.qos
                    });
                    done();
                });
            });
        });

        it("should fire a callback on suback", (done) => {
            const client = connect();
            const topic = "test";

            client.once("connect", () => {
                client.subscribe(topic, { qos: 2 }, (err, granted) => {
                    if (err) {
                        done(err);
                    } else {
                        assert.exists(granted, "granted not given");
                        assert.deepInclude(granted, { topic: "test", qos: 2 });
                        done();
                    }
                });
            });
        });

        it("should fire a callback with error if disconnected (options provided)", (done) => {
            const client = connect();
            const topic = "test";
            client.once("connect", () => {
                client.end(true, () => {
                    client.subscribe(topic, { qos: 2 }, (err, granted) => {
                        assert.notExists(granted, "granted given");
                        assert.exists(err, "no error given");
                        done();
                    });
                });
            });
        });

        it("should fire a callback with error if disconnected (options not provided)", (done) => {
            const client = connect();
            const topic = "test";

            client.once("connect", () => {
                client.end(true, () => {
                    client.subscribe(topic, (err, granted) => {
                        assert.notExists(granted, "granted given");
                        assert.exists(err, "no error given");
                        done();
                    });
                });
            });
        });

        it("should subscribe with a chinese topic", (done) => {
            const client = connect();
            const topic = "中国";

            client.once("connect", () => {
                client.subscribe(topic);
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", (packet) => {
                    assert.deepInclude(packet.subscriptions, {
                        topic,
                        qos: 0
                    });
                    done();
                });
            });
        });
    });

    describe("receiving messages", () => {
        it("should fire the message event", (done) => {
            const client = connect();
            const testPacket = {
                topic: "test",
                payload: "message",
                retain: true,
                qos: 1,
                messageId: 5
            };

            client.subscribe(testPacket.topic);
            client.once("message", (topic, message, packet) => {
                assert.equal(topic, testPacket.topic);
                assert.equal(message.toString(), testPacket.payload);
                assert.equal(packet, packet);
                client.end();
                done();
            });

            server.once("client", (serverClient) => {
                serverClient.on("subscribe", () => {
                    serverClient.publish(testPacket);
                });
            });
        });

        it("should emit a packetreceive event", (done) => {
            const client = connect();
            const testPacket = {
                topic: "test",
                payload: "message",
                retain: true,
                qos: 1,
                messageId: 5
            };

            client.subscribe(testPacket.topic);
            client.on("packetreceive", (packet) => {
                if (packet.cmd === "publish") {
                    assert.equal(packet.qos, 1);
                    assert.equal(packet.topic, testPacket.topic);
                    assert.equal(packet.payload.toString(), testPacket.payload);
                    assert.equal(packet.retain, true);
                    client.end();
                    done();
                }
            });

            server.once("client", (serverClient) => {
                serverClient.on("subscribe", () => {
                    serverClient.publish(testPacket);
                });
            });
        });

        it("should support binary data", (done) => {
            const client = connect({ encoding: "binary" });
            const testPacket = {
                topic: "test",
                payload: "message",
                retain: true,
                qos: 1,
                messageId: 5
            };

            client.subscribe(testPacket.topic);
            client.once("message", (topic, message, packet) => {
                assert.equal(topic, testPacket.topic);
                assert.instanceOf(message, Buffer);
                assert.equal(message.toString(), testPacket.payload);
                assert.equal(packet, packet);
                done();
            });

            server.once("client", (serverClient) => {
                serverClient.on("subscribe", () => {
                    serverClient.publish(testPacket);
                });
            });
        });

        it("should emit a message event (qos=2)", (done) => {
            const client = connect();
            const testPacket = {
                topic: "test",
                payload: "message",
                retain: true,
                qos: 2,
                messageId: 5
            };

            server.testPublish = testPacket;

            client.subscribe(testPacket.topic);
            client.once("message", (topic, message, packet) => {
                assert.equal(topic, testPacket.topic);
                assert.equal(message.toString(), testPacket.payload);
                assert.equal(packet, packet);
                done();
            });

            server.once("client", (serverClient) => {
                serverClient.on("subscribe", () => {
                    serverClient.publish(testPacket);
                });
            });
        });

        it("should emit a message event (qos=2) - repeated publish", (done) => {
            const client = connect();
            const testPacket = {
                topic: "test",
                payload: "message",
                retain: true,
                qos: 2,
                messageId: 5
            };

            server.testPublish = testPacket;

            client.subscribe(testPacket.topic);
            client.on("message", (topic, message, packet) => {
                assert.equal(topic, testPacket.topic);
                assert.equal(message.toString(), testPacket.payload);
                assert.equal(packet, packet);
                done();
            });

            server.once("client", (serverClient) => {
                serverClient.on("subscribe", () => {
                    serverClient.publish(testPacket);
                    // twice, should be ignored
                    serverClient.publish(testPacket);
                });
            });
        });

        it("should support chinese topic", (done) => {
            const client = connect({ encoding: "binary" });
            const testPacket = {
                topic: "国",
                payload: "message",
                retain: true,
                qos: 1,
                messageId: 5
            };

            client.subscribe(testPacket.topic);
            client.once("message", (topic, message, packet) => {
                assert.equal(topic, testPacket.topic);
                assert.instanceOf(message, Buffer);
                assert.equal(message.toString(), testPacket.payload);
                assert.equal(packet, packet);
                done();
            });

            server.once("client", (serverClient) => {
                serverClient.on("subscribe", () => {
                    serverClient.publish(testPacket);
                });
            });
        });
    });

    describe("qos handling", () => {
        it("should follow qos 0 semantics (trivial)", (done) => {
            const client = connect();
            const testTopic = "test";
            const testMessage = "message";

            client.once("connect", () => {
                client.subscribe(testTopic, { qos: 0 });
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", () => {
                    serverClient.publish({
                        topic: testTopic,
                        payload: testMessage,
                        qos: 0,
                        retain: false
                    });
                    done();
                });
            });
        });

        it("should follow qos 1 semantics", (done) => {
            const client = connect();
            const testTopic = "test";
            const testMessage = "message";
            const mid = 50;

            client.once("connect", () => {
                client.subscribe(testTopic, { qos: 1 });
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", () => {
                    serverClient.publish({
                        topic: testTopic,
                        payload: testMessage,
                        messageId: mid,
                        qos: 1
                    });
                });

                serverClient.once("puback", (packet) => {
                    assert.equal(packet.messageId, mid);
                    done();
                });
            });
        });

        it("should follow qos 2 semantics", (done) => {
            const client = connect();
            const testTopic = "test";
            const testMessage = "message";
            const mid = 253;

            client.once("connect", () => {
                client.subscribe(testTopic, { qos: 2 });
            });

            server.once("client", (serverClient) => {
                serverClient.once("subscribe", () => {
                    serverClient.publish({
                        topic: testTopic,
                        payload: testMessage,
                        qos: 2,
                        messageId: mid
                    });
                });

                serverClient.once("pubcomp", () => {
                    done();
                });
            });
        });
    });

    describe("auto reconnect", () => {
        it("should mark the client disconnecting if #end called", () => {
            const client = connect();

            client.end();
            assert.equal(client.disconnecting, true);
        });

        it("should reconnect after stream disconnect", (done) => {
            const client = connect();
            let tryReconnect = true;

            client.on("connect", () => {
                if (tryReconnect) {
                    client.stream.end();
                    tryReconnect = false;
                } else {
                    client.end();
                    done();
                }
            });
        });

        it("should emit 'reconnect' when reconnecting", (done) => {
            const client = connect();
            let tryReconnect = true;
            let reconnectEvent = false;

            client.on("reconnect", () => {
                reconnectEvent = true;
            });

            client.on("connect", () => {
                if (tryReconnect) {
                    client.stream.end();
                    tryReconnect = false;
                } else {
                    assert.equal(reconnectEvent, true);
                    client.end();
                    done();
                }
            });
        });

        it("should emit 'offline' after going offline", (done) => {
            const client = connect();
            let tryReconnect = true;
            let offlineEvent = false;

            client.on("offline", () => {
                offlineEvent = true;
            });

            client.on("connect", () => {
                if (tryReconnect) {
                    client.stream.end();
                    tryReconnect = false;
                } else {
                    assert.equal(offlineEvent, true);
                    client.end();
                    done();
                }
            });
        });

        it("should not reconnect if it was ended by the user", (done) => {
            const client = connect();

            client.on("connect", () => {
                client.end();
                done(); // it will raise an error if called two times
            });
        });

        it("should setup a reconnect timer on disconnect", (done) => {
            const client = connect();

            client.once("connect", () => {
                assert.notExists(client.reconnectTimer);
                client.stream.end();
            });

            client.once("close", () => {
                assert.exists(client.reconnectTimer);
                client.end();
                done();
            });
        });

        it("should allow specification of a reconnect period", (done) => {
            let end;
            const period = 200;
            const client = connect({ reconnectPeriod: period });
            let reconnect = false;
            const start = Date.now();

            client.on("connect", () => {
                if (!reconnect) {
                    client.stream.end();
                    reconnect = true;
                } else {
                    client.end();
                    end = Date.now();
                    if (end - start >= period) {
                        // Connected in about 2 seconds, that's good enough
                        done();
                    } else {
                        done(new Error("Strange reconnect period"));
                    }
                }
            });
        });

        it("should resend in-flight QoS 1 publish messages from the client", (done) => {
            const client = connect({ reconnectPeriod: 200 });
            let serverPublished = false;
            let clientCalledBack = false;

            server.once("client", (serverClient) => {
                serverClient.on("connect", () => {
                    setImmediate(() => {
                        serverClient.stream.destroy();
                    });
                });

                server.once("client", (serverClientNew) => {
                    serverClientNew.on("publish", () => {
                        serverPublished = true;
                        check();
                    });
                });
            });

            client.publish("hello", "world", { qos: 1 }, () => {
                clientCalledBack = true;
                check();
            });

            function check() {
                if (serverPublished && clientCalledBack) {
                    client.end();
                    done();
                }
            }
        });

        it("should resend in-flight QoS 2 publish messages from the client", (done) => {
            const client = connect({ reconnectPeriod: 200 });
            let serverPublished = false;
            let clientCalledBack = false;

            server.once("client", (serverClient) => {
                // ignore errors
                serverClient.on("error", () => { });
                serverClient.on("publish", () => {
                    setImmediate(() => {
                        serverClient.stream.destroy();
                    });
                });

                server.once("client", (serverClientNew) => {
                    serverClientNew.on("pubrel", () => {
                        serverPublished = true;
                        check();
                    });
                });
            });

            client.publish("hello", "world", { qos: 2 }, () => {
                clientCalledBack = true;
                check();
            });

            function check() {
                if (serverPublished && clientCalledBack) {
                    client.end();
                    done();
                }
            }
        });

        it("should resubscribe when reconnecting", (done) => {
            const client = connect({ reconnectPeriod: 100 });
            let tryReconnect = true;
            let reconnectEvent = false;

            client.on("reconnect", () => {
                reconnectEvent = true;
            });

            client.on("connect", () => {
                if (tryReconnect) {
                    client.subscribe("hello", () => {
                        client.stream.end();

                        server.once("client", (serverClient) => {
                            serverClient.on("subscribe", () => {
                                client.end();
                                done();
                            });
                        });
                    });

                    tryReconnect = false;
                } else {
                    assert.equal(reconnectEvent, true);
                }
            });
        });

        context("with alternate server client", () => {
            let cachedClientListeners;

            beforeEach(() => {
                cachedClientListeners = server.listeners("client");
                server.removeAllListeners("client");
            });

            afterEach(() => {
                server.removeAllListeners("client");
                cachedClientListeners.forEach((listener) => {
                    server.on("client", listener);
                });
            });

            it("should resubscribe even if disconnect is before suback", (done) => {
                const client = adone.net.mqtt.client.connect(Object.assign({ reconnectPeriod: 100 }, config));
                let subscribeCount = 0;
                let connectCount = 0;

                server.on("client", (serverClient) => {
                    serverClient.on("connect", () => {
                        connectCount++;
                        serverClient.connack({ returnCode: 0 });
                    });

                    serverClient.on("subscribe", () => {
                        subscribeCount++;

                        // disconnect before sending the suback on the first subscribe
                        if (subscribeCount === 1) {
                            client.stream.end();
                        }

                        // after the second connection, confirm that the only two
                        // subscribes have taken place, then cleanup and exit
                        if (connectCount >= 2) {
                            assert.equal(subscribeCount, 2);
                            client.end(true, done);
                        }
                    });
                });

                client.subscribe("hello");
            });

            it("should resubscribe exactly once", (done) => {
                const client = adone.net.mqtt.client.connect(Object.assign({ reconnectPeriod: 100 }, config));
                let subscribeCount = 0;

                server.on("client", (serverClient) => {
                    serverClient.on("connect", () => {
                        serverClient.connack({ returnCode: 0 });
                    });

                    serverClient.on("subscribe", () => {
                        subscribeCount++;

                        // disconnect before sending the suback on the first subscribe
                        if (subscribeCount === 1) {
                            client.stream.end();
                        }

                        // after the second connection, only two subs
                        // subscribes have taken place, then cleanup and exit
                        if (subscribeCount === 2) {
                            client.end(true, done);
                        }
                    });
                });

                client.subscribe("hello");
            });
        });
    });
};
