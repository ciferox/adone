/* global describe it afterEach skip */

import { stub } from "sinon";
import check from "../helpers/check_redis";
import MockServer from "../helpers/mock_server";

const Redis = adone.database.Redis;

skip(check);

afterEach(function (done) {
    let redis = new Redis();
    redis.flushall(function () {
        redis.script("flush", function () {
            redis.disconnect();
            done();
        });
    });
});

describe("connection", function () {
    it("should emit \"connect\" when connected", function (done) {
        let redis = new Redis();
        redis.on("connect", function () {
            redis.disconnect();
            done();
        });
    });

    it("should emit \"close\" when disconnected", function (done) {
        let redis = new Redis();
        redis.once("end", done);
        redis.once("connect", function () {
            redis.disconnect();
        });
    });

    it("should send AUTH command before any other commands", function (done) {
        let redis = new Redis({ password: "123" });
        redis.get("foo");
        let times = 0;
        stub(redis, "sendCommand", function (command) {
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

    it("should receive replies after connection is disconnected", function (done) {
        let redis = new Redis();
        redis.set("foo", "bar", function () {
            redis.stream.end();
        });
        redis.get("foo", function (err, res) {
            expect(res).to.eql("bar");
            redis.disconnect();
            done();
        });
    });

    it("should close the connection when timeout", function (done) {
        let redis = new Redis(6379, "192.0.0.0", {
            connectTimeout: 1,
            retryStrategy: null
        });
        let pending = 2;
        redis.on("error", function (err) {
            expect(err.message).to.eql("connect ETIMEDOUT");
            if (!--pending) {
                done();
            }
        });
        redis.get("foo", function (err) {
            expect(err.message).to.match(/Connection is closed/);
            if (!--pending) {
                done();
            }
        });
    });

    it("should clear the timeout when connected", function (done) {
        let redis = new Redis({ connectTimeout: 10000 });
        setImmediate(function () {
            stub(redis.stream, "setTimeout", function (timeout) {
                expect(timeout).to.eql(0);
                redis.stream.setTimeout.restore();
                redis.disconnect();
                done();
            });
        });
    });

    describe("#connect", function () {
        it("should return a promise", function (done) {
            let pending = 2;
            let redis = new Redis({ lazyConnect: true });
            redis.connect().then(function () {
                redis.disconnect();
                if (!--pending) {
                    done();
                }
            });

            let redis2 = new Redis(6390, { lazyConnect: true, retryStrategy: null });
            redis2.connect().catch(function () {
                if (!--pending) {
                    redis2.disconnect();
                    done();
                }
            });
        });

        it("should stop reconnecting when disconnected", function (done) {
            let redis = new Redis(8999, {
                retryStrategy: function () { return 0; }
            });

            redis.on("close", function () {
                redis.disconnect();
                stub(Redis.prototype, "connect").throws(new Error("`connect` should not be called"));
                setTimeout(function () {
                    Redis.prototype.connect.restore();
                    done();
                }, 1);
            });
        });

        it("should reject when connected", function (done) {
            let redis = new Redis();
            redis.connect().catch(function (err) {
                expect(err.message).to.match(/Redis is already connecting/);
                redis.disconnect();
                done();
            });
        });
    });

    describe("retryStrategy", function () {
        it("should pass the correct retry times", function (done) {
            let t = 0;
            new Redis({
                port: 1,
                retryStrategy: function (times) {
                    expect(times).to.eql(++t);
                    if (times === 3) {
                        done();
                        return;
                    }
                    return 0;
                }
            });
        });

        it("should skip reconnecting when retryStrategy doesn't return a number", function (done) {
            let redis = new Redis({
                port: 1,
                retryStrategy: function () {
                    process.nextTick(function () {
                        expect(redis.status).to.eql("end");
                        done();
                    });
                    return null;
                }
            });
        });
    });

    describe("connectionName", function () {
        it("should name the connection if options.connectionName is not null", function (done) {
            let redis = new Redis({ connectionName: "niceName" });
            redis.once("ready", function () {
                redis.client("getname", function (err, res) {
                    expect(res).to.eql("niceName");
                    redis.disconnect();
                    done();
                });
            });
            redis.set("foo", 1);
        });

        it("should set the name before any subscribe command if reconnected", function (done) {
            let redis = new Redis({ connectionName: "niceName" });
            redis.once("ready", function () {
                redis.subscribe("l", function () {
                    redis.disconnect(true);
                    redis.unsubscribe("l", function () {
                        redis.client("getname", function (err, res) {
                            expect(res).to.eql("niceName");
                            redis.disconnect();
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("readOnly", function () {
        it("should send readonly command before other commands", function (done) {
            let called = false;
            let redis = new Redis({ port: 30001, readOnly: true, showFriendlyErrorStack: true });
            let node = new MockServer(30001, function (argv) {
                if (argv[0] === "readonly") {
                    called = true;
                } else if (argv[0] === "get" && argv[1] === "foo") {
                    expect(called).to.eql(true);
                    redis.disconnect();
                    node.disconnect(function () {
                        done();
                    });
                }
            });
            redis.get("foo").catch(function () { });
        });
    });

    describe("autoResendUnfulfilledCommands", function () {
        it("should resend unfulfilled commands to the correct db when reconnected", function (done) {
            let redis = new Redis({ db: 3 });
            let pub = new Redis({ db: 3 });
            redis.once("ready", function () {
                let pending = 2;
                redis.blpop("l", 0, function (err, res) {
                    expect(res[0]).to.eql("l");
                    expect(res[1]).to.eql("1");
                    if (!--pending) {
                        redis.disconnect();
                        pub.disconnect();
                        done();
                    }
                });
                redis.set("foo", "1");
                redis.pipeline().incr("foo").exec(function (err, res) {
                    expect(res[0][1]).to.eql(2);
                    if (!--pending) {
                        redis.disconnect();
                        pub.disconnect();
                        done();
                    }
                });
                setTimeout(function () {
                    redis.stream.end();
                }, 0);
            });
            redis.once("close", function () {
                pub.lpush("l", 1);
            });
        });

        it("should resend previous subscribes before sending unfulfilled commands", function (done) {
            let redis = new Redis({ db: 4 });
            let pub = new Redis({ db: 4 });
            redis.once("ready", function () {
                pub.pubsub("channels", function (err, channelsBefore) {
                    redis.subscribe("l", function () {
                        redis.disconnect(true);
                        redis.unsubscribe("l", function () {
                            pub.pubsub("channels", function (err, channels) {
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
