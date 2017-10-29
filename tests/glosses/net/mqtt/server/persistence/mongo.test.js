const abstract = require("./abstract");
const Mongo = adone.net.mqtt.server.persistence.Mongo;
const MongoClient = require("mongodb").MongoClient;
const clean = require("mongo-clean");
const steed = require("steed");

describe("mosca.persistence.Mongo", function () {

    this.timeout(4000);

    const opts = {
        url: "mongodb://localhost:27017/moscatests",
        autoClose: false,
        ttl: {
            subscriptions: 1000,
            packets: 1000
        }
    };

    before(function connect(done) {
        // Connect to the db
        MongoClient.connect(opts.url, { safe: true }, (err, db) => {
            opts.connection = db;
            done(err);
        });
    });

    beforeEach(function cleanDB(done) {
        clean(opts.connection, done);
    });

    afterEach(function () {
        this.secondInstance = null;
    });

    abstract(Mongo, opts);

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
                payload: new Buffer("world"),
                messageId: 42
            };

            const that = this;

            this.instance.storeSubscriptions(client, () => {
                that.instance.close(() => {
                    that.instance = new Mongo(opts);
                    setTimeout(() => {
                        that.instance.storeOfflinePacket(packet, () => {
                            that.instance.streamOfflinePackets(client, (err, p) => {
                                expect(p).to.eql(packet);
                                done();
                            });
                        });
                    }, 10);
                });
            });
        });

        it("should support restoring when a string was sent", function (done) {
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
                payload: "someStringToTest", // not a buffer
                messageId: 42
            };

            const that = this;

            this.instance.storeSubscriptions(client, () => {
                that.instance.close(() => {
                    that.instance = new Mongo(opts);
                    setTimeout(() => {
                        that.instance.storeOfflinePacket(packet, () => {
                            that.instance.streamOfflinePackets(client, (err, p) => {
                                expect(p).to.eql(packet);
                                done();
                            });
                        });
                    }, 10);
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
                payload: new Buffer("world"),
                messageId: 42
            };

            const that = this;
            that.secondInstance = new Mongo(opts);

            setTimeout(() => {
                that.instance.storeSubscriptions(client, () => {
                    setTimeout(() => {
                        that.secondInstance.storeOfflinePacket(packet, () => {
                            that.instance.streamOfflinePackets(client, (err, p) => {
                                expect(p).to.eql(packet);
                                done();
                            });
                        });
                    }, 10);
                });
            }, 10);
        });
    });
});
