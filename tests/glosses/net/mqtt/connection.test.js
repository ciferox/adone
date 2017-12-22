const testStream = function () {
    return adone.stream.through.base(function (buf, enc, cb) {
        const that = this;
        setImmediate(() => {
            that.push(buf);
            cb();
        });
    });
};

describe("net", "mqtt", "connection", () => {
    beforeEach(function () {
        this.stream = testStream();
        this.conn = new adone.net.mqtt.connection.Connection(this.stream);
        this.readFromStream = (stream, length, cb) => {
            let buf;
            let done;
            stream.on("data", (data) => {
                if (done) {
                    return;
                }
                buf = buf ? Buffer.concat([buf, data]) : data;
                if (buf.length >= length) {
                    cb(buf.slice(0, length));
                    done = true;
                }
            });
        };
    });

    it("should start piping in the next tick", function (done) {
        expect(this.stream._readableState.flowing).to.be.null();
        process.nextTick(() => {
            expect(this.stream._readableState.flowing).to.be.true();
            done();
        });
    });

    describe("parsing", () => {
        describe("connect", () => {
            it("should fire a connect event (minimal)", function (done) {
                const expected = {
                    cmd: "connect",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 18,
                    protocolId: "MQIsdp",
                    protocolVersion: 3,
                    clean: false,
                    keepalive: 30,
                    clientId: "test",
                    topic: null,
                    payload: null
                };

                const fixture = [
                    16, 18, // Header
                    0, 6, // Protocol id length
                    77, 81, 73, 115, 100, 112, // Protocol id
                    3, // Protocol version
                    0, // Connect flags
                    0, 30, // Keepalive
                    0, 4, // Client id length
                    116, 101, 115, 116 // Client id
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("connect", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            it("should fire a connect event (maximal)", function (done) {
                const expected = {
                    cmd: "connect",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 54,
                    protocolId: "MQIsdp",
                    protocolVersion: 3,
                    will: {
                        retain: true,
                        qos: 2,
                        topic: "topic",
                        payload: Buffer.from("payload")
                    },
                    clean: true,
                    keepalive: 30,
                    clientId: "test",
                    username: "username",
                    password: Buffer.from("password"),
                    topic: null,
                    payload: null
                };
                const fixture = [
                    16, 54, // Header
                    0, 6, // Protocol id length
                    77, 81, 73, 115, 100, 112, // Protocol id
                    3, // Protocol version
                    246, // Connect flags
                    0, 30, // Keepalive
                    0, 4, // Client id length
                    116, 101, 115, 116, // Client id
                    0, 5, // Will topic length
                    116, 111, 112, 105, 99, // Will topic
                    0, 7, // Will payload length
                    112, 97, 121, 108, 111, 97, 100, // Will payload
                    0, 8, // Username length
                    117, 115, 101, 114, 110, 97, 109, 101, // Username
                    0, 8, // Password length
                    112, 97, 115, 115, 119, 111, 114, 100 // Password
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("connect", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            describe("parse errors", () => {
                it("should say protocol not parseable", function (done) {
                    const fixture = [
                        16, 4,
                        0, 6,
                        77, 81
                    ];

                    this.stream.write(Buffer.from(fixture));
                    this.conn.once("error", (err) => {
                        assert.match(err.message, /cannot parse protocolId/i);
                        done();
                    });
                });
            });
        });

        describe("connack", () => {
            it("should fire a connack event (rc = 0)", function (done) {
                const expected = {
                    cmd: "connack",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2,
                    sessionPresent: false,
                    returnCode: 0,
                    topic: null,
                    payload: null
                };

                const fixture = [32, 2, 0, 0];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("connack", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            it("should fire a connack event (rc = 5)", function (done) {
                const expected = {
                    cmd: "connack",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2,
                    sessionPresent: false,
                    returnCode: 5,
                    topic: null,
                    payload: null
                };

                const fixture = [32, 2, 0, 5];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("connack", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("publish", () => {
            it("should fire a publish event (minimal)", function (done) {
                const expected = {
                    cmd: "publish",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 10,
                    topic: "test",
                    payload: Buffer.from("test")
                };

                const fixture = [
                    48, 10, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic (test)
                    116, 101, 115, 116 // Payload (test)
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("publish", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            it("should fire a publish event with 2KB payload", (done) => {
                const expected = {
                    cmd: "publish",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2054,
                    topic: "test",
                    payload: Buffer.allocUnsafe(2048)
                };

                let fixture = Buffer.from([
                    48, 134, 16, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116 // Topic (test)
                ]);

                fixture = Buffer.concat([fixture, expected.payload]);

                const s = testStream();
                const c = new adone.net.mqtt.connection.Connection(s);

                s.write(fixture);

                c.once("publish", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            it("should fire a publish event with 2MB payload", (done) => {
                const expected = {
                    cmd: "publish",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 6 + 2 * 1024 * 1024,
                    topic: "test",
                    payload: Buffer.allocUnsafe(2 * 1024 * 1024)
                };

                let fixture = Buffer.from([
                    48, 134, 128, 128, 1, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116 // Topic (test)
                ]);

                fixture = Buffer.concat([fixture, expected.payload]);

                const s = testStream();
                const c = new adone.net.mqtt.connection.Connection(s);

                s.write(fixture);

                c.once("publish", (packet) => {
                    // Comparing the whole 2MB buffer is very slow so only check the length
                    assert.equal(packet.length, expected.length);
                    done();
                });
            });

            it("should fire a publish event (maximal)", function (done) {
                const expected = {
                    cmd: "publish",
                    retain: true,
                    qos: 2,
                    length: 12,
                    dup: true,
                    topic: "test",
                    messageId: 10,
                    payload: Buffer.from("test")
                };

                const fixture = [
                    61, 12, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic
                    0, 10, // Message id
                    116, 101, 115, 116 // Payload
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("publish", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            it("should fire an empty publish", function (done) {
                const expected = {
                    cmd: "publish",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 6,
                    topic: "test",
                    payload: Buffer.allocUnsafe(0)
                };

                const fixture = [
                    48, 6, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116 // Topic
                    // Empty payload
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("publish", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            it("should parse a splitted publish", function (done) {
                const expected = {
                    cmd: "publish",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 10,
                    topic: "test",
                    payload: Buffer.from("test")
                };

                const fixture1 = [
                    48, 10, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116 // Topic (test)
                ];

                const fixture2 = [
                    116, 101, 115, 116 // Payload (test)
                ];

                this.stream.write(Buffer.from(fixture1));
                this.stream.write(Buffer.from(fixture2));

                this.conn.once("publish", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("puback", () => {
            it("should fire a puback event", function (done) {
                const expected = {
                    cmd: "puback",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2,
                    messageId: 2,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    64, 2, // Header
                    0, 2 // Message id
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("puback", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("pubrec", () => {
            it("should fire a pubrec event", function (done) {
                const expected = {
                    cmd: "pubrec",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2,
                    messageId: 3,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    80, 2, // Header
                    0, 3 // Message id
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("pubrec", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("pubrel", () => {
            it("should fire a pubrel event", function (done) {
                const expected = {
                    cmd: "pubrel",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2,
                    messageId: 4,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    96, 2, // Header
                    0, 4 // Message id
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("pubrel", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("pubcomp", () => {
            it("should fire a pubcomp event", function (done) {
                const expected = {
                    cmd: "pubcomp",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2,
                    messageId: 5,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    112, 2, // Header
                    0, 5 // Message id
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("pubcomp", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("subscribe", () => {
            it("should fire a subscribe event (1 topic)", function (done) {
                const expected = {
                    cmd: "subscribe",
                    retain: false,
                    qos: 1,
                    dup: false,
                    length: 9,
                    subscriptions: [
                        {
                            topic: "test",
                            qos: 0
                        }
                    ],
                    messageId: 6,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    130, 9, // Header (publish, qos=1, length=9)
                    0, 6, // Message id (6)
                    0, 4, // Topic length,
                    116, 101, 115, 116, // Topic (test)
                    0 // Qos (0)
                ];
                this.stream.write(Buffer.from(fixture));

                this.conn.once("subscribe", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });

            it("should fire a subscribe event (3 topic)", function (done) {
                const expected = {
                    cmd: "subscribe",
                    retain: false,
                    qos: 1,
                    dup: false,
                    length: 23,
                    subscriptions: [
                        {
                            topic: "test",
                            qos: 0
                        }, {
                            topic: "uest",
                            qos: 1
                        }, {
                            topic: "tfst",
                            qos: 2
                        }
                    ],
                    messageId: 6,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    130, 23, // Header (publish, qos=1, length=9)
                    0, 6, // Message id (6)
                    0, 4, // Topic length,
                    116, 101, 115, 116, // Topic (test)
                    0, // Qos (0)
                    0, 4, // Topic length
                    117, 101, 115, 116, // Topic (uest)
                    1, // Qos (1)
                    0, 4, // Topic length
                    116, 102, 115, 116, // Topic (tfst)
                    2 // Qos (2)
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("subscribe", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("suback", () => {
            it("should fire a suback event", function (done) {
                const expected = {
                    cmd: "suback",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 6,
                    granted: [0, 1, 2, 128],
                    messageId: 6,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    144, 6, // Header
                    0, 6, // Message id
                    0, 1, 2, 128 // Granted qos (0, 1, 2) and a rejected being 0x80
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("suback", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("unsubscribe", () => {
            it("should fire an unsubscribe event", function (done) {
                const expected = {
                    cmd: "unsubscribe",
                    retain: false,
                    qos: 1,
                    dup: false,
                    length: 14,
                    unsubscriptions: [
                        "tfst",
                        "test"
                    ],
                    messageId: 7,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    162, 14,
                    0, 7, // Message id (7)
                    0, 4, // Topic length
                    116, 102, 115, 116, // Topic (tfst)
                    0, 4, // Topic length,
                    116, 101, 115, 116 // Topic (test)
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("unsubscribe", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("unsuback", () => {
            it("should fire a unsuback event", function (done) {
                const expected = {
                    cmd: "unsuback",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 2,
                    messageId: 8,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    176, 2, // Header
                    0, 8 // Message id
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("unsuback", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("pingreq", () => {
            it("should fire a pingreq event", function (done) {
                const expected = {
                    cmd: "pingreq",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 0,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    192, 0 // Header
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("pingreq", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("pingresp", () => {
            it("should fire a pingresp event", function (done) {
                const expected = {
                    cmd: "pingresp",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 0,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    208, 0 // Header
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("pingresp", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("disconnect", () => {
            it("should fire a disconnect event", function (done) {
                const expected = {
                    cmd: "disconnect",
                    retain: false,
                    qos: 0,
                    dup: false,
                    length: 0,
                    topic: null,
                    payload: null
                };

                const fixture = [
                    224, 0 // Header
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("disconnect", (packet) => {
                    assert.deepEqual(packet, expected);
                    done();
                });
            });
        });

        describe("reserverd (15)", () => {
            it("should emit an error", function (done) {
                const fixture = [
                    240, 0 // Header
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("error", () => {
                    done();
                });
            });
        });

        describe("reserverd (0)", () => {
            it("should emit an error", function (done) {
                const fixture = [
                    0, 0 // Header
                ];

                this.stream.write(Buffer.from(fixture));

                this.conn.once("error", () => {
                    done();
                });
            });
        });
    });

    describe("transmission", () => {
        describe("#connect", () => {
            it("should send a connect packet (minimal)", function (done) {
                const expected = Buffer.from([
                    16, 18, // Header
                    0, 6, 77, 81, 73, 115, 100, 112, // Protocol Id
                    3, // Protocol version
                    0, // Connect flags
                    0, 30, // Keepalive
                    0, 4, // Client id length
                    116, 101, 115, 116 // Client Id
                ]);

                const fixture = {
                    protocolId: "MQIsdp",
                    protocolVersion: 3,
                    clientId: "test",
                    keepalive: 30,
                    clean: false
                };

                this.conn.connect(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a connect packet (maximal)", function (done) {
                const expected = Buffer.from([
                    16, 54, // Header
                    0, 6, 77, 81, 73, 115, 100, 112, // Protocol Id
                    3, // Protocol version
                    246, // Connect flags (u=1,p=1,wr=1,wq=2,wf=1,c=1)
                    0, 30, // Keepalive (30)
                    0, 4, // Client id length
                    116, 101, 115, 116, // Client Id
                    0, 5, // Will topic length
                    116, 111, 112, 105, 99, // Will topic ('topic')
                    0, 7, // Will payload length
                    112, 97, 121, 108, 111, 97, 100, // ('payload')
                    0, 8, // Username length
                    117, 115, 101, 114, 110, 97, 109, 101, // ('username')
                    0, 8, // Password length
                    112, 97, 115, 115, 119, 111, 114, 100 // ('password')
                ]);

                const fixture = {
                    protocolId: "MQIsdp",
                    protocolVersion: 3,
                    clientId: "test",
                    keepalive: 30,
                    will: {
                        topic: "topic",
                        payload: "payload",
                        qos: 2,
                        retain: true
                    },
                    clean: true,
                    username: "username",
                    password: "password"
                };

                this.conn.connect(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a connect packet with binary username/password", function (done) {
                const expected = Buffer.from([
                    16, 28, // Header
                    0, 6, 77, 81, 73, 115, 100, 112, // Protocol Id
                    3, // Protocol version
                    0x40 | 0x80, // Connect flags
                    0, 30, // Keepalive
                    0, 4, // Client id length
                    116, 101, 115, 116, // Client Id
                    0, 3, // Username length
                    12, 13, 14, // Username
                    0, 3, // Password length
                    15, 16, 17 // Password
                ]);

                const fixture = {
                    protocolId: "MQIsdp",
                    protocolVersion: 3,
                    clientId: "test",
                    keepalive: 30,
                    clean: false,
                    username: Buffer.from([12, 13, 14]),
                    password: Buffer.from([15, 16, 17])
                };

                const s = testStream();
                const c = new adone.net.mqtt.connection.Connection(s, { encoding: "binary" });

                s.removeAllListeners();
                c.connect(fixture);

                this.readFromStream(s, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a connect packet with binary will payload", function (done) {
                const expected = Buffer.from([
                    16, 50, // Header
                    0, 6, 77, 81, 73, 115, 100, 112, // Protocol Id
                    3, // Protocol version
                    246, // Connect flags
                    0, 30, // Keepalive
                    0, 4, // Client id length
                    116, 101, 115, 116, // Client Id
                    0, 5, // Will topic length
                    116, 111, 112, 105, 99, // Will topic ('topic')
                    0, 3, // Will payload length
                    18, 19, 20, // Will payload
                    0, 8, // Username length
                    117, 115, 101, 114, 110, 97, 109, 101, // ('username')
                    0, 8, // Password length
                    112, 97, 115, 115, 119, 111, 114, 100 // ('password')
                ]);

                const fixture = {
                    protocolId: "MQIsdp",
                    protocolVersion: 3,
                    clientId: "test",
                    keepalive: 30,
                    will: {
                        topic: "topic",
                        payload: Buffer.from([18, 19, 20]),
                        qos: 2,
                        retain: true
                    },
                    clean: true,
                    username: "username",
                    password: "password"
                };

                const s = testStream();
                const c = new adone.net.mqtt.connection.Connection(s, { encoding: "binary" });

                s.removeAllListeners();
                c.connect(fixture);

                this.readFromStream(s, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a connect packet with unicode will payload", function (done) {
                const expected = Buffer.from([
                    16, 49, // Header
                    0, 6, 77, 81, 73, 115, 100, 112, // Protocol Id
                    3, // Protocol version
                    246, // Connect flags
                    0, 30, // Keepalive
                    0, 4, // Client id length
                    116, 101, 115, 116, // Client Id
                    0, 5, // Will topic length
                    116, 111, 112, 105, 99, // Will topic ('topic')
                    0, 2, // Will payload length
                    194, 167, // Will payload - '§'
                    0, 8, // Username length
                    117, 115, 101, 114, 110, 97, 109, 101, // ('username')
                    0, 8, // Password length
                    112, 97, 115, 115, 119, 111, 114, 100 // ('password')
                ]);

                const fixture = {
                    protocolId: "MQIsdp",
                    protocolVersion: 3,
                    clientId: "test",
                    keepalive: 30,
                    will: {
                        topic: "topic",
                        payload: "§",
                        qos: 2,
                        retain: true
                    },
                    clean: true,
                    username: "username",
                    password: "password"
                };

                const s = testStream();
                const c = new adone.net.mqtt.connection.Connection(s, { encoding: "binary" });

                s.removeAllListeners();
                c.connect(fixture);

                this.readFromStream(s, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            describe("invalid options", () => {
                describe("protocol id", () => {
                    it("should reject non-string", function (done) {
                        const fixture = {
                            protocolId: 42,
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 30
                        };

                        const expectedErr = "Invalid protocolId";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });
                });

                describe("protocol version", () => {
                    it("should reject non-number", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: [],
                            clientId: "test",
                            keepalive: 30
                        };

                        const expectedErr = "Invalid protocol version";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject >255", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 300,
                            clientId: "test",
                            keepalive: 30
                        };

                        const expectedErr = "Invalid protocol version";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject <0", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: -20,
                            clientId: "test",
                            keepalive: 30
                        };

                        const expectedErr = "Invalid protocol version";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });
                });

                describe("client id", () => {
                    it("should reject non-present", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            keepalive: 30
                        };

                        const expectedErr = "clientId must be supplied before 3.1.1";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject empty", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "",
                            keepalive: 30
                        };

                        const expectedErr = "clientId must be supplied before 3.1.1";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject non-string", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: {},
                            keepalive: 30
                        };

                        const expectedErr = "clientId must be supplied before 3.1.1";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });
                });

                describe("keepalive", () => {
                    it("should reject non-number", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: "blah"
                        };

                        const expectedErr = "Invalid keepalive";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject < 0", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: -2
                        };

                        const expectedErr = "Invalid keepalive";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject > 65535", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 65536
                        };

                        const expectedErr = "Invalid keepalive";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });
                });

                describe("will", () => {
                    it("should reject non-object", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 30,
                            will: "test"
                        };

                        const expectedErr = "Invalid will";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject will without valid topic", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 30,
                            will: {
                                topic: 0,
                                payload: "test",
                                qos: 0,
                                retain: false
                            }
                        };

                        const expectedErr = "Invalid will topic";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it("should reject will without valid payload", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 30,
                            will: {
                                topic: "test",
                                payload: 42,
                                qos: 0,
                                retain: false
                            }
                        };

                        const expectedErr = "Invalid will payload";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });

                    it.skip("should reject will with invalid qos", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 30,
                            will: {
                                topic: "test",
                                payload: "test",
                                qos: "",
                                retain: false
                            }
                        };

                        const expectedErr = "Invalid will qos";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });
                });

                describe("username", () => {
                    it("should reject invalid username", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 30,
                            username: 30
                        };

                        const expectedErr = "Invalid username";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });
                });

                describe("password", () => {
                    it("should reject invalid password", function (done) {
                        const fixture = {
                            protocolId: "MQIsdp",
                            protocolVersion: 3,
                            clientId: "test",
                            keepalive: 30,
                            password: 30
                        };

                        const expectedErr = "Invalid password";

                        this.conn.once("error", (error) => {
                            assert.equal(error.message, expectedErr);
                            done();
                        });

                        this.conn.connect(fixture);
                    });
                });
            });
        });

        describe("#connack", () => {
            it("should send a connack packet (rc = 0)", function (done) {
                const expected = Buffer.from([
                    32, 2, // Header
                    0, 0 // Rc=0
                ]);

                const fixture = {
                    returnCode: 0
                };

                this.conn.connack(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a connack packet (rc = 4)", function (done) {
                const expected = Buffer.from([
                    32, 2, // Header
                    0, 4 // Rc=0
                ]);

                const fixture = {
                    returnCode: 4
                };

                this.conn.connack(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should reject invalid rc", function (done) {
                this.conn.once("error", (error) => {
                    assert.equal(error.message, "Invalid return code");
                    done();
                });
                this.conn.connack({ returnCode: "asdf" });
            });
        });

        describe("#publish", () => {
            it("should send a publish packet (minimal)", function (done) {
                const expected = Buffer.from([
                    48, 10, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic ('test')
                    116, 101, 115, 116 // Payload ('test')
                ]);

                const fixture = {
                    topic: "test",
                    payload: "test"
                };

                this.conn.publish(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a publish packet (maximal)", function (done) {
                const expected = Buffer.from([
                    61, 12, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic ('test')
                    0, 7, // Message id (7)
                    116, 101, 115, 116 // Payload ('test')
                ]);

                const fixture = {
                    topic: "test",
                    payload: "test",
                    qos: 2,
                    retain: true,
                    dup: true,
                    messageId: 7
                };

                this.conn.publish(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a publish packet (empty)", function (done) {
                const expected = Buffer.from([
                    48, 6, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116 // Topic ('test')
                    // Empty payload
                ]);

                const fixture = {
                    topic: "test"
                };

                this.conn.publish(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a publish packet (buffer)", function (done) {
                const expected = Buffer.from([
                    48, 10, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic ('test')
                    0, 0, 0, 0 // Payload
                ]);
                const buf = Buffer.allocUnsafe(4);
                buf.fill(0);

                const fixture = {
                    topic: "test",
                    payload: buf
                };

                this.conn.publish(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a publish packet of 2KB", function (done) {
                let expected = Buffer.from([
                    48, 134, 16, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116 // Topic ('test')
                ]);
                const payload = Buffer.allocUnsafe(2048);

                expected = Buffer.concat([expected, payload]);

                const fixture = {
                    topic: "test",
                    payload
                };

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });

                this.conn.publish(fixture);
                this.conn.end();
            });

            it("should send a publish packet of 2MB", function (done) {
                let expected = Buffer.from([
                    48, 134, 128, 128, 1, // Header
                    0, 4, // Topic length
                    116, 101, 115, 116 // Topic ('test')
                ]);
                const payload = Buffer.allocUnsafe(2 * 1024 * 1024);

                expected = Buffer.concat([expected, payload]);

                const fixture = {
                    topic: "test",
                    payload
                };

                this.conn.publish(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    // Comparing the whole 2MB buffer is very slow so only check the length
                    assert.equal(data.length, expected.length);
                    done();
                });
            });

            it("should reject invalid topic", function (done) {
                const error = "Invalid topic";

                this.conn.once("error", (err) => {
                    assert.equal(err.message, error);
                    done();
                });
                this.conn.publish({ topic: 0 });
            });
            // it("should reject invalid payloads, maybe");
            it("should reject invalid mid", function (done) {
                this.conn.once("error", (err) => {
                    assert.equal(err.message, "Invalid messageId");
                    done();
                });
                this.conn.publish({ topic: "test", messageId: "", qos: 1 });
            });
        });

        describe("#puback", () => {
            it("should send a puback packet", function (done) {
                const expected = Buffer.from([
                    64, 2, // Header
                    0, 30 // Mid=30
                ]);

                const fixture = {
                    messageId: 30
                };

                this.conn.puback(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should reject invalid mid", function (done) {
                this.conn.once("error", (error) => {
                    assert.equal(error.message, "Invalid messageId");
                    done();
                });
                this.conn.puback({ messageId: "" });
            });
        });

        describe("#pubrec", () => {
            it("should send a pubrec packet", function (done) {
                const expected = Buffer.from([
                    80, 2, // Header
                    0, 3 // Mid=3
                ]);

                const fixture = {
                    messageId: 3
                };

                this.conn.pubrec(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            // it("should reject invalid mid");
        });

        describe("#pubrel", () => {
            it("should send a pubrel packet", function (done) {
                const expected = Buffer.from([
                    98, 2, // Header
                    0, 6 // Mid=6
                ]);

                const fixture = {
                    messageId: 6
                };

                this.conn.pubrel(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            // it("should reject invalid mid");
        });

        describe("#pubcomp", () => {
            it("should send a pubcomp packet", function (done) {
                const expected = Buffer.from([
                    112, 2, // Header
                    0, 9 // Mid=9
                ]);

                const fixture = {
                    messageId: 9
                };

                this.conn.pubcomp(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            // it("should reject invalid mid");
        });

        describe("#subscribe", () => {
            it("should send a subscribe packet (single)", function (done) {
                const expected = Buffer.from([
                    130, 9, // Header
                    0, 7, // Message id
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic
                    0 // Qos=0
                ]);

                const fixture = {
                    messageId: 7,
                    subscriptions: [
                        {
                            topic: "test",
                            qos: 0
                        }
                    ]
                };

                this.conn.subscribe(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a subscribe packet (multiple)", function (done) {
                const expected = Buffer.from([
                    130, 23, // Header
                    0, 8, // Message id
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic ('test')
                    0, // Qos=0
                    0, 4, // Topic length
                    117, 101, 115, 116, // Topic ('uest')
                    1, // Qos=1
                    0, 4, // Topic length
                    116, 101, 115, 115, // Topic ('tess')
                    2 // Qos=2
                ]);

                const fixture = {
                    messageId: 8,
                    subscriptions: [
                        {
                            topic: "test",
                            qos: 0
                        }, {
                            topic: "uest",
                            qos: 1
                        }, {
                            topic: "tess",
                            qos: 2
                        }
                    ]
                };

                this.conn.subscribe(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });
            it("should reject invalid subscriptions", function (done) {
                this.conn.once("error", (error) => {
                    assert.equal(error.message, "Invalid subscriptions");
                    done();
                });
                this.conn.subscribe({
                    messageId: 1, subscriptions: ""
                });
            });

            // it("should reject invalid subscription objects");
            it("should reject invalid mid", function (done) {
                this.conn.once("error", (error) => {
                    assert.equal(error.message, "Invalid messageId");
                    done();
                });
                this.conn.subscribe({
                    messageId: "", subscriptions: [{ topic: "test", qos: 1 }]
                });
            });
        });

        describe("#suback", () => {
            it("should send a suback packet", function (done) {
                const expected = Buffer.from([
                    144, 5, // Length
                    0, 4, // Mid=4
                    0, // Qos=0
                    1, // Qos=1
                    2 // Qos=2
                ]);

                const fixture = {
                    granted: [0, 1, 2],
                    messageId: 4
                };

                this.conn.suback(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            // it("should reject invalid mid");
            it("should reject invalid qos vector", function (done) {
                this.conn.on("error", (error) => {
                    assert.equal(error.message, "Invalid qos vector");
                    done();
                });
                this.conn.suback({ granted: "", messageId: 1 });
            });
        });

        describe("#unsubscribe", () => {
            it("should send an unsubscribe packet", function (done) {
                const expected = Buffer.from([
                    162, 14, // Header
                    0, 6, // Mid=6
                    0, 4, // Topic length
                    116, 101, 115, 116, // Topic ('test')
                    0, 4, // Topic length
                    116, 115, 101, 116 // Topic ('tset')
                ]);

                const fixture = {
                    messageId: 6,
                    unsubscriptions: [
                        "test", "tset"
                    ]
                };

                this.conn.unsubscribe(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should reject invalid unsubs", function (done) {
                this.conn.once("error", (error) => {
                    assert.equal(error.message, "Invalid unsubscriptions");
                    done();
                });
                this.conn.unsubscribe({
                    messageId: 1,
                    unsubscriptions: ""
                });
            });
            // it("should reject invalid mids");
        });

        describe("#unsuback", () => {
            it("should send a unsuback packet", function (done) {
                const expected = Buffer.from([
                    176, 2, // Header
                    0, 8 // Mid=8
                ]);

                const fixture = {
                    messageId: 8
                };

                this.conn.unsuback(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            // it("should reject invalid mid");
        });

        describe("#pingreq", () => {
            it("should send a pingreq packet", function (done) {
                const expected = Buffer.from([
                    192, 0 // Header
                ]);

                const fixture = {
                };

                this.conn.pingreq(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });
        });

        describe("#pingresp", () => {
            it("should send a pingresp packet", function (done) {
                const expected = Buffer.from([
                    208, 0 // Header
                ]);

                const fixture = {
                };

                this.conn.pingresp(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });
        });

        describe("#disconnect", () => {
            it("should send a disconnect packet", function (done) {
                const expected = Buffer.from([
                    224, 0 // Header
                ]);

                const fixture = {
                };

                this.conn.disconnect(fixture);

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });

            it("should send a null disconnect packet", function (done) {
                const expected = Buffer.from([
                    224, 0 // Header
                ]);

                this.conn.disconnect();

                this.readFromStream(this.stream, expected.length, (data) => {
                    assert.deepEqual(data, expected);
                    done();
                });
            });
        });
    });
});
