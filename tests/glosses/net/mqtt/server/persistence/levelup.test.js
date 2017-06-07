const abstract = require("./abstract");
const pino = require("pino");
const LevelUp = adone.net.mqtt.server.persistence.LevelUp;
const steed = require("steed");
const tmpdir = require("osenv").tmpdir();
const path = require("path");
const rimraf = require("rimraf");

describe("mosca.persistence.LevelUp", function () {

    this.timeout(4000);

    const opts = {
        ttl: {
            subscriptions: 250,
            packets: 250
        }
    };

    abstract(LevelUp, function (cb) {
        const that = this;
        opts.path = path.join(tmpdir, `level_${Date.now()}`);
        cb(null, opts);
    });

    afterEach(function deleteLevel(done) {
        rimraf(opts.path, done);
    });

    describe("two instances", () => {
        it("support restoring from disk", function (done) {
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

            const that = this;

            this.instance.storeSubscriptions(client, () => {
                that.instance.close(() => {
                    new LevelUp(opts, (err, newdb) => {
                        newdb.storeOfflinePacket(packet, () => {
                            newdb.streamOfflinePackets(client, (err, p) => {
                                expect(p).to.eql(packet);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
