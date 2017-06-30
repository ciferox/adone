import check from "../helpers/check_redis";

describe("database", "redis", "send command", { skip: check }, () => {
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

    it("should support callback", (done) => {
        const redis = new Redis();
        redis.set("foo", "bar");
        redis.get("foo", (err, result) => {
            expect(result).to.eql("bar");
            redis.disconnect();
            done();
        });
    });

    it("should support promise", () => {
        const redis = new Redis();
        redis.set("foo", "bar");
        return redis.get("foo").then((result) => {
            expect(result).to.eql("bar");
            redis.disconnect();
        }, (err) => {
            redis.disconnect();
            throw err;
        });
    });

    it("should keep the response order when mix using callback & promise", (done) => {
        const redis = new Redis();
        let order = 0;
        redis.get("foo").then(() => {
            expect(++order).to.eql(1);
        });
        redis.get("foo", () => {
            expect(++order).to.eql(2);
        });
        redis.get("foo").then(() => {
            expect(++order).to.eql(3);
        });
        redis.get("foo", () => {
            expect(++order).to.eql(4);
            redis.disconnect();
            done();
        });
    });

    it("should support get & set buffer", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.set(new Buffer("foo"), new Buffer("bar"), (err, res) => {
            expect(res).to.eql("OK");
        });
        redis.getBuffer(new Buffer("foo"), (err, result) => {
            expect(result).to.be.instanceof(Buffer);
            expect(result.toString()).to.eql("bar");
            redis.disconnect();
            done();
        });
    });

    it("should support get & set buffer via `call`", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.call("set", new Buffer("foo"), new Buffer("bar"), (err, res) => {
            expect(res).to.eql("OK");
        });
        redis.callBuffer("get", new Buffer("foo"), (err, result) => {
            expect(result).to.be.instanceof(Buffer);
            expect(result.toString()).to.eql("bar");
            redis.disconnect();
            done();
        });
    });

    it("should handle empty buffer", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.set(new Buffer("foo"), new Buffer(""));
        redis.getBuffer(new Buffer("foo"), (err, result) => {
            expect(result).to.be.instanceof(Buffer);
            expect(result.toString()).to.eql("");
            redis.disconnect();
            done();
        });
    });

    it("should support utf8", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.set(new Buffer("你好"), new String("你好"));
        redis.getBuffer("你好", (err, result) => {
            expect(result.toString()).to.eql("你好");
            redis.get("你好", (err, result) => {
                expect(result).to.eql("你好");
                redis.disconnect();
                done();
            });
        });
    });

    it("should consider null as empty str", (done) => {
        const redis = new Redis();
        redis.set("foo", null, () => {
            redis.get("foo", (err, res) => {
                expect(res).to.eql("");
                redis.disconnect();
                done();
            });
        });
    });

    it("should support return int value", (done) => {
        const redis = new Redis();
        redis.exists("foo", (err, exists) => {
            expect(typeof exists).to.eql("number");
            redis.disconnect();
            done();
        });
    });

    it("should reject when disconnected", (done) => {
        const redis = new Redis();
        redis.disconnect();
        redis.get("foo", (err) => {
            expect(err.message).to.match(/Connection is closed./);
            redis.disconnect();
            done();
        });
    });

    it("should reject when enableOfflineQueue is disabled", (done) => {
        const redis = new Redis({ enableOfflineQueue: false });
        redis.get("foo", (err) => {
            expect(err.message).to.match(/enableOfflineQueue options is false/);
            redis.disconnect();
            done();
        });
    });

    it("should support key prefixing", (done) => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.set("bar", "baz");
        redis.get("bar", (err, result) => {
            expect(result).to.eql("baz");
            redis.keys("*", (err, result) => {
                expect(result).to.eql(["foo:bar"]);
                redis.disconnect();
                done();
            });
        });
    });

    it("should support key prefixing with multiple keys", (done) => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.lpush("app1", "test1");
        redis.lpush("app2", "test2");
        redis.lpush("app3", "test3");
        redis.blpop("app1", "app2", "app3", 0, (err, result) => {
            expect(result).to.eql(["foo:app1", "test1"]);
            redis.keys("*", (err, result) => {
                expect(result).to.have.members(["foo:app2", "foo:app3"]);
                redis.disconnect();
                done();
            });
        });
    });

    it("should support key prefixing for zunionstore", (done) => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.zadd("zset1", 1, "one");
        redis.zadd("zset1", 2, "two");
        redis.zadd("zset2", 1, "one");
        redis.zadd("zset2", 2, "two");
        redis.zadd("zset2", 3, "three");
        redis.zunionstore("out", 2, "zset1", "zset2", "WEIGHTS", 2, 3, (err, result) => {
            expect(result).to.eql(3);
            redis.keys("*", (err, result) => {
                expect(result).to.have.members(["foo:zset1", "foo:zset2", "foo:out"]);
                redis.disconnect();
                done();
            });
        });
    });

    it("should support key prefixing for sort", (done) => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.hset("object_1", "name", "better");
        redis.hset("weight_1", "value", "20");
        redis.hset("object_2", "name", "best");
        redis.hset("weight_2", "value", "30");
        redis.hset("object_3", "name", "good");
        redis.hset("weight_3", "value", "10");
        redis.lpush("src", "1", "2", "3");
        redis.sort("src", "BY", "weight_*->value", "GET", "object_*->name", "STORE", "dest", (err, result) => {
            redis.lrange("dest", 0, -1, (err, result) => {
                expect(result).to.eql(["good", "better", "best"]);
                redis.keys("*", (err, result) => {
                    expect(result).to.have.members([
                        "foo:object_1",
                        "foo:weight_1",
                        "foo:object_2",
                        "foo:weight_2",
                        "foo:object_3",
                        "foo:weight_3",
                        "foo:src",
                        "foo:dest"
                    ]);
                    redis.disconnect();
                    done();
                });
            });
        });
    });

    it("should allow sending the loading valid commands in connect event", (done) => {
        const redis = new Redis({ enableOfflineQueue: false });
        redis.on("connect", () => {
            redis.select(2, (err, res) => {
                expect(res).to.eql("OK");
                redis.disconnect();
                done();
            });
        });
    });

    it("should reject loading invalid commands in connect event", (done) => {
        const redis = new Redis({ enableOfflineQueue: false });
        redis.on("connect", () => {
            redis.get("foo", (err) => {
                expect(err.message).to.eql("Stream isn't writeable and enableOfflineQueue options is false");
                redis.disconnect();
                done();
            });
        });
    });
});
