const abstract = require("./abstract");
const Redis = adone.net.mqtt.server.persistence.Redis;
const redis = require("ioredis");

describe("mosca.persistence.Redis", function () {

    this.timeout(5000);

    const opts = {
        ttl: {
            subscriptions: 1000,
            packets: 200
        }
    };

    abstract(Redis, opts);

    afterEach(function afterEachRedis(cb) {
        function flush() {
            const client = redis.createClient();
            client.flushdb(() => {
                client.quit(cb);
            });
        }

        if (this.secondInstance) {
            this.secondInstance.close(flush);
            this.secondInstance = null;
        } else {
            flush();
        }
    });

    describe("two clients", () => {

        it("should support restoring", function (done) {
            const client = {
                id: "my client id - 42",
                clean: false,
                subscriptions: {
                    "hello/#": {
                        qos: 1
                    }
                }
            };

            const packet = {
                topic: "hello/42",
                qos: 0,
                payload: Buffer.from("world"),
                messageId: "42"
            };

            const that = this;

            this.instance.storeSubscriptions(client, () => {
                that.instance.close(() => {
                    that.instance = new Redis(opts, (err, second) => {
                        second.storeOfflinePacket(packet, () => {
                            second.streamOfflinePackets(client, (err, p) => {
                                expect(p).to.eql(packet);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("should support subscriptions for clients with id containing ':'", function (done) {
            const client = {
                id: "0e:40:08:ab:1d:a2",
                clean: false,
                subscriptions: {
                    "hello/#": {
                        qos: 1
                    }
                }
            };

            const that = this;

            this.instance.storeSubscriptions(client, () => {
                that.instance.close(() => {
                    that.instance = new Redis(opts, (err, second) => {
                        second.lookupSubscriptions(client, (err, subs) => {
                            expect(subs).to.eql(client.subscriptions);
                            done();
                        });
                    });
                });
            });
        });

        it("should support restoring for clients with id containing ':'", function (done) {
            const client = {
                id: "0e:40:08:ab:1d:a3",
                clean: false,
                subscriptions: {
                    "hello/#": {
                        qos: 1
                    }
                }
            };

            const packet = {
                topic: "hello/43",
                qos: 0,
                payload: Buffer.from("world"),
                messageId: "43"
            };

            const that = this;

            this.instance.storeSubscriptions(client, () => {
                that.instance.close(() => {
                    that.instance = new Redis(opts, (err, second) => {
                        second.storeOfflinePacket(packet, () => {
                            second.streamOfflinePackets(client, (err, p) => {
                                expect(p).to.eql(packet);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it("should support synchronization", function (done) {
            const client = {
                id: "my client id - 42",
                clean: false,
                subscriptions: {
                    "hello/#": {
                        qos: 1
                    }
                }
            };

            const packet = {
                topic: "hello/42",
                qos: 0,
                payload: Buffer.from("world"),
                messageId: "42"
            };

            const that = this;
            that.secondInstance = new Redis(opts, () => {
                that.instance.storeSubscriptions(client, () => {
                    setTimeout(() => {
                        that.secondInstance.storeOfflinePacket(packet, () => {
                            that.instance.streamOfflinePackets(client, (err, p) => {
                                expect(p).to.eql(packet);
                                done();
                            });
                        });
                    }, 20);
                });
            });
        });
    });

    describe("ttl.packets", () => {

        let redisClient;

        beforeEach(() => {
            redisClient = redis.createClient();
        });

        afterEach((done) => {
            redisClient.quit(done);
        });

        const client = {
            id: "my client id - 46",
            clean: false,
            subscriptions: {
                "hello/#": {
                    qos: 1
                }
            }
        };

        it("expired packet id should be removed", function (done) {
            const that = this;

            const packet = {
                topic: "hello/46",
                qos: 0,
                payload: Buffer.from("world"),
                messageId: "46"
            };

            that.instance.storeSubscriptions(client, () => {
                that.instance.storeOfflinePacket(packet, () => {
                    setTimeout(() => {
                        redisClient.get(`packets:${client.id}:${packet.messageId}`, (err, result) => {
                            expect(result).to.eql(null);
                            done();
                        });
                    }, 250);
                });
            });
        });

        it("expired packet id should be cleaned from list key", function (done) {

            const that = this;

            let firstPacket = {
                topic: "hello/46",
                qos: 0,
                payload: Buffer.from("world"),
                messageId: "46"
            },
                secondPacket = {
                    topic: "hello/47",
                    qos: 0,
                    payload: Buffer.from("mosca"),
                    messageId: "47"
                };

            function delayStoreOfflinePacket(packet, delay, cb) {
                setTimeout(() => {
                    that.instance.storeOfflinePacket(packet, cb);
                }, delay);
            }

            that.instance.storeSubscriptions(client, () => {
                delayStoreOfflinePacket(firstPacket, 1, (err) => {
                    delayStoreOfflinePacket(secondPacket, 250, (err) => {
                        that.instance.streamOfflinePackets(client, (err, p) => {
                            expect(p).to.eql(secondPacket);
                        });

                        setTimeout(() => {
                            redisClient.llen(`packets:${client.id}`, (err, length) => {
                                expect(length).to.eql(1);
                                done();
                            });
                        }, 50);
                    });
                });
            });
        });

    });


    describe("clustered.environment", () => {

        it("should forward each packet once after client reconnects", function (done) {
            const client = {
                id: "cluster client id - 42",
                clean: false,
                subscriptions: {
                    "hello/#": {
                        qos: 1
                    }
                }
            };

            const packet = {
                topic: "hello/42",
                qos: 0,
                payload: Buffer.from("world"),
                messageId: "42"
            };

            const that = this;
            that.secondInstance = new Redis(opts, () => {
                that.instance.storeSubscriptions(client, () => {
                    // simulate client reconnect since storeSubscriptions is called on disconnect
                    // no matter client connects to instance or secondInstance
                    that.secondInstance.storeSubscriptions(client, () => {
                        setTimeout(() => {
                            that.secondInstance.storeOfflinePacket(packet, () => {
                                that.instance.streamOfflinePackets(client, (err, p) => {
                                    expect(p).to.eql(packet);
                                    done(); // should be called once
                                });
                            });
                        }, 50);
                    });
                });
            });
        });

    });
});


describe("mosca.persistence.Redis select database", () => {
    const opts = {
        ttl: {
            subscriptions: 1000,
            packets: 1000
        },
        db: 1 // different from default redis database
    };

    abstract(Redis, opts);

    function flush(cb) {
        const client = redis.createClient();
        client.select(opts.db);
        client.flushdb(() => {
            client.quit(cb);
        });
    }

    beforeEach(function afterEachRedis(cb) {
        flush(cb);
    });

    afterEach(function afterEachRedis(cb) {
        flush(cb);
    });

    it("should have persistent data in selected database", function (done) {
        const client = {
            id: "my client id",
            clean: false,
            subscriptions: {
                "hello/#": {
                    qos: 1
                }
            }
        };

        const redisClientSubscriptionKey = `client:sub:${client.id}`;

        this.instance.storeSubscriptions(client, () => {

            const redisClient = redis.createClient();
            redisClient.select(opts.db);
            redisClient.exists(redisClientSubscriptionKey, (err, existence) => {
                expect(Boolean(existence)).to.eql(true);
                redisClient.quit(done);
            });
        });
    });
});
