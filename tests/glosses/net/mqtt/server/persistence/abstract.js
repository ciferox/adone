const steed = require("steed");
const pino = require("pino");
const EventEmitter = require("events").EventEmitter;

module.exports = function (create, buildOpts) {
    let _opts;

    if (typeof buildOpts !== "function") {
        _opts = buildOpts;
        buildOpts = function (cb) {
            cb(null, _opts);
        };
    }

    beforeEach(function build(done) {
        const that = this;
        buildOpts((err, opts) => {
            if (err) {
                return done(err);
            }

            create(opts, (err, result) => {
                if (err) {
                    return done(err);
                }

                that.instance = result;
                that.opts = opts;
                done();
            });
        });
    });

    afterEach(function afterEachPersistenceAbstract(done) {
        const that = this;
        setImmediate(() => {
            that.instance.close(done);
            that.instance = null;
        });
    });

    describe("retained messages", () => {

        it("should store retain messages", function (done) {
            const packet = {
                topic: "hello",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };
            this.instance.storeRetained(packet, done);
        });

        it("should lookup retain messages and not match", function (done) {
            this.instance.lookupRetained("hello", (err, results) => {
                expect(results).to.eql([]);
                done();
            });
        });

        it("should lookup invalid topic and not crash", function (done) {
            this.instance.lookupRetained("\\", (err, results) => {
                expect(results).to.eql([]);
                done();
            });
        });

        it("should match and load a retained message", function (done) {
            const packet = {
                topic: "hello",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };

            const instance = this.instance;

            steed.series([
                function (cb) {
                    instance.storeRetained(packet, cb);
                },
                function (cb) {
                    instance.lookupRetained("hello", (err, results) => {
                        expect(results[0].topic).to.eql(packet.topic);
                        expect(results[0].payload).to.eql(packet.payload);
                        cb();
                    });
                }
            ], done);
        });

        it("should match and load a single retained message", function (done) {

            let packetMessageId = 0;

            const getPacket = function () {

                packetMessageId++;

                return {
                    topic: "hello",
                    qos: 0,
                    payload: new Buffer("world"),
                    messageId: "packetMessageId",
                    retain: true
                };
            };

            const instance = this.instance;

            steed.parallel([
                function (cb) {
                    instance.storeRetained(getPacket(), cb);
                },
                function (cb) {
                    instance.storeRetained(getPacket(), cb);
                },
                function (cb) {
                    instance.storeRetained(getPacket(), cb);
                },
                function (cb) {
                    instance.storeRetained(getPacket(), cb);
                },
                function (cb) {
                    instance.storeRetained(getPacket(), cb);
                }
            ], (err, results) => {
                instance.lookupRetained("hello", (err, results) => {
                    expect(results.length).to.be.eql(1);
                    done();
                });
            });
        });

        it("should overwrite a retained message", function (done) {
            const packet = {
                topic: "hello",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };

            const packet2 = {
                topic: "hello",
                qos: 0,
                payload: new Buffer("matteo"),
                messageId: "43",
                retain: true
            };

            const instance = this.instance;

            steed.series([
                instance.storeRetained.bind(instance, packet),
                instance.storeRetained.bind(instance, packet2),
                function (cb) {
                    instance.lookupRetained("hello", (err, results) => {
                        expect(results).to.have.property("length", 1);
                        expect(results[0].payload.toString()).to.equal("matteo");
                        cb();
                    });
                }
            ], done);
        });

        it("should remove a retained message if the payload is empty", function (done) {
            const packet = {
                topic: "hello",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };

            const packet2 = {
                topic: "hello",
                qos: 0,
                payload: new Buffer(0),
                messageId: "43",
                retain: true
            };

            const instance = this.instance;

            steed.series([
                instance.storeRetained.bind(instance, packet),
                instance.storeRetained.bind(instance, packet2),
                function (cb) {
                    instance.lookupRetained("hello", (err, results) => {
                        expect(results).to.have.property("length", 0);
                        cb();
                    });
                }
            ], done);
        });

        it("should match and load with a 'some' pattern", function (done) {
            const packet1 = {
                topic: "hello/1",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };

            const packet2 = {
                topic: "hello/2",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "43",
                retain: true
            };

            const instance = this.instance;

            steed.series([
                function (cb) {
                    instance.storeRetained(packet1, cb);
                },
                function (cb) {
                    instance.storeRetained(packet2, cb);
                },
                function (cb) {
                    instance.lookupRetained("hello/#", (err, results) => {
                        expect(results[0].topic).to.eql(packet1.topic);
                        expect(results[0].payload.toString()).to.eql(packet1.payload.toString());
                        expect(results[1].topic).to.eql(packet2.topic);
                        expect(results[1].payload.toString()).to.eql(packet2.payload.toString());
                        cb();
                    });
                }
            ], done);
        });

        it("should match and load with a 'one' pattern", function (done) {
            const packet1 = {
                topic: "hello/1",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };

            const packet2 = {
                topic: "hello/2",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "43",
                retain: true
            };

            const instance = this.instance;

            steed.series([
                function (cb) {
                    instance.storeRetained(packet1, cb);
                },
                function (cb) {
                    instance.storeRetained(packet2, cb);
                },
                function (cb) {
                    instance.lookupRetained("hello/+", (err, results) => {
                        expect(results[0].topic).to.eql(packet1.topic);
                        expect(results[0].payload.toString()).to.eql(packet1.payload.toString());
                        expect(results[1].topic).to.eql(packet2.topic);
                        expect(results[1].payload.toString()).to.eql(packet2.payload.toString());
                        cb();
                    });
                }
            ], done);
        });

        it("should wire itself up to storePacket method of a Server", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;
            const packet1 = {
                topic: "hello/1",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };

            instance.wire(server);
            server.storePacket(packet1, () => {
                instance.lookupRetained(packet1.topic, (err, results) => {
                    expect(results[0].topic).to.eql(packet1.topic);
                    expect(results[0].payload.toString()).to.eql(packet1.payload.toString());
                    done();
                });
            });
        });

        it("should wire itself up to the forwardRetained method of a Server", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;
            const packet1 = {
                topic: "hello/1",
                qos: 0,
                payload: new Buffer("world"),
                messageId: "42",
                retain: true
            };

            const client = {
                logger: pino({ level: "error" }),
                forward(topic, payload, options, pattern) {
                    expect(topic).to.eql(packet1.topic);
                    expect(payload).to.eql(packet1.payload);
                    expect(options.topic).to.eql(packet1.topic);
                    expect(options.payload).to.eql(packet1.payload);
                    expect(options.qos).to.eql(packet1.qos);
                    expect(pattern).to.eql("hello/#");
                    done();
                }
            };

            instance.wire(server);

            instance.storeRetained(packet1, () => {
                server.forwardRetained("hello/#", client);
            });
        });
    });

    describe("subscriptions", () => {

        it("should store the an offline client subscriptions", function (done) {
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };
            this.instance.storeSubscriptions(client, done);
        });

        it("should load the offline client subscriptions", function (done) {
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };
            this.instance.lookupSubscriptions(client, (err, results) => {
                expect(results).to.eql({});
                done();
            });
        });

        it("should store and load the an offline client subscriptions", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeSubscriptions(client, () => {
                instance.lookupSubscriptions(client, (err, results) => {
                    expect(results).to.eql(client.subscriptions);
                    done();
                });
            });
        });

        it("should not store the subscriptions of clean client", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: true,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeSubscriptions(client, () => {
                client.clean = false;
                instance.lookupSubscriptions(client, (err, results) => {
                    expect(results).to.eql({});
                    done();
                });
            });
        });

        it("should not remove the subscriptions after lookup", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeSubscriptions(client, () => {
                instance.lookupSubscriptions(client, () => {
                    instance.lookupSubscriptions(client, (err, results) => {
                        expect(results).not.to.eql({});
                        done();
                    });
                });
            });
        });

        it("should allow a clean client to connect", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: true,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.lookupSubscriptions(client, (err, results) => {
                expect(results).to.eql({});
                done();
            });
        });

        it("should load an empty subscriptions object for a clean client", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeSubscriptions(client, () => {
                client.clean = true;
                instance.lookupSubscriptions(client, (err, results) => {
                    expect(results).to.eql({});
                    done();
                });
            });
        });

        it("should clean up the subscription store if a clean client connects", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeSubscriptions(client, () => {
                client.clean = true;
                instance.lookupSubscriptions(client, (err, results) => {
                    client.clean = false;
                    instance.lookupSubscriptions(client, (err, results) => {
                        expect(results).to.eql({});
                        done();
                    });
                });
            });
        });

        it("should wire itself up to the restoreClientSubscriptions method of a Server", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;

            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                },
                handleAuthorizeSubscribe(err, success, subscription, callback) {
                    expect(success).to.eql(true);
                    expect(subscription).to.eql({ topic: "hello", qos: 1 });
                    expect(callback).to.be.a("function");
                    done();
                }
            };

            instance.wire(server);

            instance.storeSubscriptions(client, () => {
                server.restoreClientSubscriptions(client);
            });
        });

        it("should wire itself up to the persistClient method of a Server", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;

            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.wire(server);
            server.persistClient(client, () => {
                instance.lookupSubscriptions(client, (err, results) => {
                    expect(results).to.eql(client.subscriptions);
                    done();
                });
            });
        });

        it("should clean up the subscription store after a TTL", function (done) {
            const instance = this.instance;
            const that = this;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeSubscriptions(client, () => {
                setTimeout(() => {
                    instance.lookupSubscriptions(client, (err, results) => {
                        expect(results).to.eql({});
                        done();
                    });
                }, that.opts.ttl.subscriptions * 2);
            });
        });

        it("should not store a QoS 0 subscription", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 0
                    }
                }
            };

            instance.storeSubscriptions(client, () => {
                instance.lookupSubscriptions(client, (err, results) => {
                    expect(results).to.eql({});
                    done();
                });
            });
        });
    });

    describe("offline packets", () => {
        const client = {
            id: "my client id - 42",
            clean: false,
            logger: pino({ level: "error" }),
            subscriptions: {
                hello: {
                    qos: 1
                }
            }
        };

        const packet = {
            topic: "hello",
            qos: 1,
            payload: new Buffer("world"),
            messageId: "42"
        };

        beforeEach(function (done) {
            this.instance.storeSubscriptions(client, done);
        });

        it("should store an offline packet", function (done) {
            this.instance.storeOfflinePacket(packet, done);
        });

        it("should not stream any offline packet", function (done) {
            // ensure persistence engine call "done"
            this.instance.streamOfflinePackets(client, (err, packet) => {
                done(new Error("this should never be called"));
            }, done);
        });

        it("should store and stream an offline packet", function (done) {
            const instance = this.instance;
            instance.storeOfflinePacket(packet, () => {
                instance.streamOfflinePackets(client, (err, p) => {
                    expect(p).to.eql(packet);
                    done();
                });
            });
        });

        it("should support multiple subscription command", function (done) {
            const instance = this.instance;
            instance.storeSubscriptions(client, () => {
                instance.storeOfflinePacket(packet, () => {
                    instance.streamOfflinePackets(client, (err, p) => {
                        expect(p).to.eql(packet);
                        done();
                    });
                });
            });
        });

        it("should delete the offline packets once streamed", function (done) {
            const instance = this.instance;
            instance.storeOfflinePacket(packet, () => {
                instance.streamOfflinePackets(client, (err, p) => {
                    instance.streamOfflinePackets(client, (err, p2) => {
                        expect(p2).to.eql(p);
                        done();
                    });
                });
            });
        });

        it("should delete an offline packet if said so", function (done) {
            const instance = this.instance;
            instance.storeOfflinePacket(packet, () => {
                instance.deleteOfflinePacket(client, packet.messageId, (err) => {
                    instance.streamOfflinePackets(client, (err, p2) => {
                        done(new Error("this should never be called"));
                    });
                    done();
                });
            });
        });

        it("should update the id of an offline packet", function (done) {
            const instance = this.instance;
            instance.storeOfflinePacket(packet, () => {
                instance.streamOfflinePackets(client, (err, p3) => {
                    const p4 = Object.create(p3);
                    p4.messageId = "12345";
                    instance.updateOfflinePacket(client, p3.messageId, p4, (err) => {
                        instance.streamOfflinePackets(client, (err, p2) => {
                            expect(p2.messageId).to.equal("12345");
                            done();
                        });
                    });
                });
            });
        });

        it("should clean up the offline packets store if a clean client connects", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeOfflinePacket(packet, () => {
                client.clean = true;
                instance.lookupSubscriptions(client, (err, results) => {
                    client.clean = false;
                    instance.streamOfflinePackets(client, (err, p) => {
                        done(new Error("this should never be called"));
                    });
                    done();
                });
            });
        });

        it("should not store any offline packet for a clean client", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: 1
                }
            };

            client.clean = true;
            instance.lookupSubscriptions(client, (err, results) => {
                instance.storeOfflinePacket(packet, () => {
                    client.clean = false;
                    instance.streamOfflinePackets(client, (err, p) => {
                        done(new Error("this should never be called"));
                    });
                    done();
                });
            });
        });

        it("should store an offline packet for a client after lookup", function (done) {
            const instance = this.instance;
            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: 1
                }
            };

            instance.lookupSubscriptions(client, (err, results) => {
                instance.storeOfflinePacket(packet, () => {
                    instance.streamOfflinePackets(client, (err, p) => {
                        expect(p).to.eql(packet);
                        done();
                    });
                });
            });
        });

        it("should not stream any offline packet to a clean client", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);

            const client = {
                id: "my client id - 42",
                clean: false,
                logger: pino({ level: "error" }),
                subscriptions: {
                    hello: {
                        qos: 1
                    }
                }
            };

            instance.storeOfflinePacket(packet, () => {
                client.clean = true;
                server.forwardOfflinePackets(client, done);
            });
        });

        it("should wire itself up to the storePacket method of a Server", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;

            instance.wire(server);
            server.storePacket(packet, () => {
                instance.streamOfflinePackets(client, (err, p1) => {
                    expect(p1).to.eql(packet);
                    done();
                });
            });
        });

        it("should wire itself up to the forwardOfflinePackets method of a Server", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;

            instance.wire(server);

            client.forward = function (topic, payload, options, pattern) {
                expect(topic).to.eql(packet.topic);
                expect(payload).to.eql(packet.payload);
                delete options.payload;
                delete packet.payload;
                packet.offline = true;
                expect(options).to.eql(packet);
                expect(pattern).to.eql("hello");
                done();
            };

            client.handleAuthorizeSubscribe = function (a, b, c, cb) {
                cb();
            };

            instance.storeOfflinePacket(packet, () => {
                server.forwardOfflinePackets(client);
            });
        });
    });

    describe("multiple offline packets", () => {
        const client = {
            id: "my client id",
            clean: false,
            logger: pino({ level: "error" }),
            subscriptions: {
                hello: {
                    qos: 1
                }
            }
        };

        const first_packet = {
            topic: "hello",
            qos: 1,
            payload: new Buffer("world"),
            messageId: "42"
        };

        const second_packet = {
            topic: "hello",
            qos: 1,
            payload: new Buffer("mosca"),
            messageId: "43"
        };

        beforeEach(function (done) {
            this.instance.storeSubscriptions(client, done);
        });

        it("should store and stream multiple offline packet", function (done) {
            const packets = [];
            function onStreamPacket(err, packet) {
                packets.push(packet);
                if (packets.length === 2) {
                    expect(packets[0]).to.eql(first_packet);
                    expect(packets[1]).to.eql(second_packet);
                    done();
                }
            }

            const instance = this.instance;
            instance.storeOfflinePacket(first_packet, () => {
                instance.storeOfflinePacket(second_packet, () => {
                    instance.streamOfflinePackets(client, onStreamPacket);
                });
            });
        });
    });

    describe("offline packets pattern", () => {
        const client = {
            id: "my client id - 42",
            clean: false,
            logger: pino({ level: "error" }),
            subscriptions: {
                "hello/#": {
                    qos: 1
                }
            }
        };

        const packet = {
            topic: "hello/42",
            qos: 0,
            payload: new Buffer("world"),
            messageId: "42"
        };

        beforeEach(function (done) {
            this.instance.storeSubscriptions(client, done);
        });

        it("should store and stream an offline packet", function (done) {
            const instance = this.instance;
            instance.storeOfflinePacket(packet, () => {
                instance.streamOfflinePackets(client, (err, p) => {
                    expect(p).to.eql(packet);
                    done();
                });
            });
        });
    });

    describe("inflight packets", () => {
        const packet = {
            topic: "hello",
            qos: 1,
            payload: new Buffer("world"),
            messageId: "42"
        };
        const client = {
            id: "my client id - 42",
            clean: false,
            logger: pino({ level: "error" }),
            subscriptions: {
                hello: {
                    qos: 1
                }
            },
            inflight: {
                42: packet
            }
        };

        it("should not delete the offline packets once streamed", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);

            instance.storeSubscriptions(client, () => {
                server.storePacket(packet, () => {
                    instance.streamOfflinePackets(client, (err, p) => {
                        instance.streamOfflinePackets(client, (err, p2) => {
                            expect(p2).to.eql(p);
                            done();
                        });
                    });
                });
            });
        });

        it("should wire itself up to the persistClient method of a Server", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);

            client.handleAuthorizeSubscribe = function (err, success, s, cb) {
                return cb(null, true);
            };

            server.persistClient(client, () => {
                server.restoreClientSubscriptions(client, (err) => {
                    done();
                });
            });
        });

        it("should not generate duplicate packets on persistClient", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);

            instance.storeSubscriptions(client, () => {
                server.storePacket(packet, () => {
                    server.persistClient(client, () => {
                        instance.streamOfflinePackets(client, (err, packet) => {
                            //should be called only once
                            done();
                        });
                    });
                });
            });

        });
    });

    describe("storeMessagesQos0 = false", () => {

        const client = {
            id: "my client id - 42",
            clean: false,
            subscriptions: {
                "hello/#": {
                    qos: 1
                }
            },
            logger: {
                debug() {
                }
            }
        };

        it("qos 0, retain false", function (done) {
            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);
            instance.options.storeMessagesQos0 = false;

            const packet = {
                topic: "hello/42",
                qos: 0,
                retain: false,
                payload: new Buffer("world"),
                // TODO: if messageId is an integer then persist redis test fail !!!
                messageId: "42"
            };

            server.persistClient(client, () => {
                server.storePacket(packet, () => {
                    instance.streamOfflinePackets(client, (err, p) => {
                        done(new Error("this should never be called"));
                    });
                    done();
                });
            });

        });

        it("qos 0, retain true", function (done) {

            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);
            instance.options.storeMessagesQos0 = false;

            const packet = {
                topic: "hello/42",
                qos: 0,
                retain: true,
                payload: new Buffer("world"),
                // TODO: if messageId is an integer then persist redis test fail !!!
                messageId: "42"
            };

            client.forward = function (topic, payload, options) {
                expect(topic).to.eql(packet.topic);
                expect(payload).to.eql(packet.payload);
                expect(options.topic).to.eql(packet.topic);
                expect(options.payload).to.eql(packet.payload);
                expect(options.qos).to.eql(packet.qos);
                done();
            };

            server.persistClient(client, () => {
                server.storePacket(packet, () => {
                    server.forwardRetained("hello/42", client);
                    instance.streamOfflinePackets(client, (err, p) => {
                        done(new Error("this should never be called"));
                    });
                });
            });
        });

    });

    describe("storeMessagesQos0 = true", () => {

        const client = {
            id: "my client id - 42",
            clean: false,
            subscriptions: {
                "hello/#": {
                    qos: 1
                }
            },
            logger: {
                debug() {
                }
            }
        };

        it("qos 0, retain false", function (done) {

            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);
            instance.options.storeMessagesQos0 = true;

            const packet = {
                topic: "hello/42",
                qos: 0,
                retain: false,
                payload: new Buffer("world"),
                // TODO: if messageId is an integer then persist redis test fail !!!
                messageId: "42"
            };

            server.persistClient(client, () => {
                server.storePacket(packet, () => {
                    instance.streamOfflinePackets(client, (err, p) => {
                        expect(p).to.eql(packet);
                        done();
                    });
                });
            });

        });

        it("qos 0, retain true", function (done) {

            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);
            instance.options.storeMessagesQos0 = true;

            const packet = {
                topic: "hello/42",
                qos: 0,
                retain: true,
                payload: new Buffer("world"),
                // TODO: if messageId is an integer then persist redis test fail !!!
                messageId: "42"
            };

            server.persistClient(client, () => {
                server.storePacket(packet, () => {
                    instance.streamOfflinePackets(client, (err, p) => {
                        expect(p).to.eql(packet);
                        done();
                    });
                });
            });

        });
    });

    describe("storeMessagesQos0 = true, multiple", () => {

        const client = {
            id: "my client id - 42",
            clean: false,
            subscriptions: {
                "hello/#": {
                    qos: 1
                }
            },
            logger: {
                debug() {
                }
            }
        };

        const packet1 = {
            topic: "hello/42",
            qos: 0,
            retain: false,
            payload: new Buffer("hello"),
            // TODO: if messageId is an integer then persist redis test fail !!!
            messageId: "42"
        };

        const packet2 = {
            topic: "hello/42",
            qos: 0,
            retain: false,
            payload: new Buffer("my"),
            // TODO: if messageId is an integer then persist redis test fail !!!
            messageId: "43"
        };

        const packet3 = {
            topic: "hello/42",
            qos: 0,
            retain: false,
            payload: new Buffer("world"),
            // TODO: if messageId is an integer then persist redis test fail !!!
            messageId: "44"
        };

        it("multiple qos 0", function (done) {

            const server = new EventEmitter();
            const instance = this.instance;
            instance.wire(server);
            instance.options.storeMessagesQos0 = true;

            const packets = [];

            server.persistClient(client, () => {
                server.storePacket(packet1, () => {
                    server.storePacket(packet2, () => {
                        server.storePacket(packet3, () => {
                            instance.streamOfflinePackets(client, (err, p) => {

                                packets.push(p);

                                if (packets.length == 3) {
                                    expect(packets[0]).to.eql(packet1);
                                    expect(packets[1]).to.eql(packet2);
                                    expect(packets[2]).to.eql(packet3);
                                    done();
                                }
                            });
                        });
                    });
                });
            });
        });

    });

    describe("offline packets - not send is expired", () => {

        const client = {
            id: "my client id - 42",
            clean: false,
            subscriptions: {
                "hello/#": {
                    qos: 1
                }
            }
        };

        it("do not send expires packages", function (done) {
            const instance = this.instance;

            const packet = {
                topic: "hello/42",
                qos: 1,
                retain: false,
                payload: new Buffer("world"),
                messageId: "42"
            };

            instance.storeSubscriptions(client, () => {
                instance.storeOfflinePacket(packet, () => {
                    setTimeout(() => {
                        instance.streamOfflinePackets(client, (err, p) => {
                            done(new Error("this should never be called"));
                        }, done);
                    }, instance.options.ttl.packets + 500);
                });
            });
        });

        it("do not send expires packages - multiple", function (done) {
            const instance = this.instance;

            const packet1 = {
                topic: "hello/42",
                qos: 1,
                retain: false,
                payload: new Buffer("hello"),
                messageId: "42"
            };

            const packet2 = {
                topic: "hello/42",
                qos: 1,
                retain: false,
                payload: new Buffer("my"),
                messageId: "43"
            };

            const packet3 = {
                topic: "hello/42",
                qos: 1,
                retain: false,
                payload: new Buffer("world"),
                messageId: "44"
            };

            instance.storeSubscriptions(client, () => {
                instance.storeOfflinePacket(packet1, () => {
                    instance.storeOfflinePacket(packet2, () => {
                        instance.storeOfflinePacket(packet3, () => {
                            setTimeout(() => {
                                instance.streamOfflinePackets(client, (err, p) => {
                                    done(new Error("this should never be called"));
                                }, done);
                            }, instance.options.ttl.packets + 500);
                        });
                    });
                });
            });
        });

    });

};

