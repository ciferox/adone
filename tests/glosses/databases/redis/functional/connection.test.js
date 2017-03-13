import check from "../helpers/check_redis";
import MockServer from "../helpers/mock_server";

skip(check);

describe("glosses", "databases", "redis", "connection", () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach((done) => {
        const redis = new Redis();
        redis.flushall(() => {
            redis.script("flush", () => {
                redis.disconnect();
                done();
            });
        });
    });

    it("should emit \"connect\" when connected", (done) => {
        const redis = new Redis();
        redis.on("connect", () => {
            redis.disconnect();
            done();
        });
    });

    it("should emit \"close\" when disconnected", (done) => {
        const redis = new Redis();
        redis.once("end", done);
        redis.once("connect", () => {
            redis.disconnect();
        });
    });

    it("should send AUTH command before any other commands", (done) => {
        const redis = new Redis({ password: "123" });
        redis.get("foo");
        let times = 0;
        stub(redis, "sendCommand").callsFake((command) => {
            times += 1;
            if (times === 1) {
                expect(command.name).to.eql("auth");
                redis.disconnect();
            } else if (times === 2) {
                expect(command.name).to.eql("info");
                done();
            }
        });
    });

    it("should receive replies after connection is disconnected", (done) => {
        const redis = new Redis();
        redis.set("foo", "bar", () => {
            redis.stream.end();
        });
        redis.get("foo", (err, res) => {
            expect(res).to.eql("bar");
            redis.disconnect();
            done();
        });
    });

    it("should close the connection when timeout", (done) => {
        const redis = new Redis(6379, "192.0.0.0", {
            connectTimeout: 1,
            retryStrategy: null
        });
        let pending = 2;
        redis.on("error", (err) => {
            expect(err.message).to.eql("connect ETIMEDOUT");
            if (!--pending) {
                done();
            }
        });
        redis.get("foo", (err) => {
            expect(err.message).to.match(/Connection is closed/);
            if (!--pending) {
                done();
            }
        });
    });

    it("should clear the timeout when connected", (done) => {
        const redis = new Redis({ connectTimeout: 10000 });
        setImmediate(() => {
            stub(redis.stream, "setTimeout").callsFake((timeout) => {
                expect(timeout).to.eql(0);
                redis.stream.setTimeout.restore();
                redis.disconnect();
                done();
            });
        });
    });

    describe("#connect", () => {
        it("should return a promise", (done) => {
            let pending = 2;
            const redis = new Redis({ lazyConnect: true });
            redis.connect().then(() => {
                redis.disconnect();
                if (!--pending) {
                    done();
                }
            });

            const redis2 = new Redis(6390, { lazyConnect: true, retryStrategy: null });
            redis2.connect().catch(() => {
                if (!--pending) {
                    redis2.disconnect();
                    done();
                }
            });
        });

        it("should stop reconnecting when disconnected", (done) => {
            const redis = new Redis(8999, {
                retryStrategy() {
                    return 0;
                }
            });

            redis.on("close", () => {
                redis.disconnect();
                stub(Redis.prototype, "connect").throws(new Error("`connect` should not be called"));
                setTimeout(() => {
                    Redis.prototype.connect.restore();
                    done();
                }, 1);
            });
        });

        it("should reject when connected", (done) => {
            const redis = new Redis();
            redis.connect().catch((err) => {
                expect(err.message).to.match(/Redis is already connecting/);
                redis.disconnect();
                done();
            });
        });
    });

    describe("retryStrategy", () => {
        it("should pass the correct retry times", (done) => {
            let t = 0;
            new Redis({
                port: 1,
                retryStrategy(times) {
                    expect(times).to.eql(++t);
                    if (times === 3) {
                        done();
                        return;
                    }
                    return 0;
                }
            });
        });

        it("should skip reconnecting when retryStrategy doesn't return a number", (done) => {
            const redis = new Redis({
                port: 1,
                retryStrategy() {
                    process.nextTick(() => {
                        expect(redis.status).to.eql("end");
                        done();
                    });
                    return null;
                }
            });
        });
    });

    describe("connectionName", () => {
        it("should name the connection if options.connectionName is not null", (done) => {
            const redis = new Redis({ connectionName: "niceName" });
            redis.once("ready", () => {
                redis.client("getname", (err, res) => {
                    expect(res).to.eql("niceName");
                    redis.disconnect();
                    done();
                });
            });
            redis.set("foo", 1);
        });

        it("should set the name before any subscribe command if reconnected", (done) => {
            const redis = new Redis({ connectionName: "niceName" });
            redis.once("ready", () => {
                redis.subscribe("l", () => {
                    redis.disconnect(true);
                    redis.unsubscribe("l", () => {
                        redis.client("getname", (err, res) => {
                            expect(res).to.eql("niceName");
                            redis.disconnect();
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("readOnly", () => {
        it("should send readonly command before other commands", (done) => {
            let called = false;
            const redis = new Redis({ port: 30001, readOnly: true, showFriendlyErrorStack: true });
            const node = new MockServer(30001, (argv) => {
                if (argv[0] === "readonly") {
                    called = true;
                } else if (argv[0] === "get" && argv[1] === "foo") {
                    expect(called).to.eql(true);
                    redis.disconnect();
                    node.disconnect(() => {
                        done();
                    });
                }
            });
            redis.get("foo").catch(() => { });
        });
    });

    describe("autoResendUnfulfilledCommands", () => {
        it("should resend unfulfilled commands to the correct db when reconnected", (done) => {
            const redis = new Redis({ db: 3 });
            const pub = new Redis({ db: 3 });
            redis.once("ready", () => {
                let pending = 2;
                redis.blpop("l", 0, (err, res) => {
                    expect(res[0]).to.eql("l");
                    expect(res[1]).to.eql("1");
                    if (!--pending) {
                        redis.disconnect();
                        pub.disconnect();
                        done();
                    }
                });
                redis.set("foo", "1");
                redis.pipeline().incr("foo").exec((err, res) => {
                    expect(res[0][1]).to.eql(2);
                    if (!--pending) {
                        redis.disconnect();
                        pub.disconnect();
                        done();
                    }
                });
                setTimeout(() => {
                    redis.stream.end();
                }, 0);
            });
            redis.once("close", () => {
                pub.lpush("l", 1);
            });
        });

        it("should resend previous subscribes before sending unfulfilled commands", (done) => {
            const redis = new Redis({ db: 4 });
            const pub = new Redis({ db: 4 });
            redis.once("ready", () => {
                pub.pubsub("channels", (err, channelsBefore) => {
                    redis.subscribe("l", () => {
                        redis.disconnect(true);
                        redis.unsubscribe("l", () => {
                            pub.pubsub("channels", (err, channels) => {
                                expect(channels.length).to.eql(channelsBefore.length);
                                redis.disconnect();
                                pub.disconnect();
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
