import check from "../helpers/check_redis";

describe("database", "redis", "send command", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should work", async () => {
        const redis = new Redis();
        redis.set("foo", "bar");
        expect(await redis.get("foo")).to.be.equal("bar");
        redis.disconnect();
    });

    it("should keep the response order when mix using callback & promise", async () => {
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
        await redis.get("foo");
        expect(++order).to.be.equal(4);
        redis.disconnect();
    });

    it("should support get & set buffer", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        expect(await redis.set(Buffer.from("foo"), Buffer.from("bar"))).to.be.equal("OK");
        expect(await redis.getBuffer(Buffer.from("foo"))).to.be.deep.equal(Buffer.from("bar"));
        redis.disconnect();
    });

    it("should support get & set buffer via `call`", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        expect(await redis.call("set", Buffer.from("foo"), Buffer.from("bar"))).to.be.equal("OK");
        expect(await redis.callBuffer("get", Buffer.from("foo"))).to.be.deep.equal(Buffer.from("bar"));
        redis.disconnect();
    });

    it("should handle empty buffer", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.set(Buffer.from("foo"), Buffer.from(""));
        expect(await redis.getBuffer(Buffer.from("foo"))).to.be.deep.equal(Buffer.alloc(0));
        redis.disconnect();
    });

    it("should support utf8", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.set(Buffer.from("你好"), new String("你好"));
        const res = await redis.getBuffer("你好");
        expect(res.toString()).to.be.equal("你好");
        expect(await redis.get("你好")).to.be.equal("你好");
        redis.disconnect();
    });

    it("should consider null as empty str", async () => {
        const redis = new Redis();
        await redis.set("foo", null);
        expect(await redis.get("foo")).to.be.equal("");
        redis.disconnect();
    });

    it("should support return int value", async () => {
        const redis = new Redis();
        expect(await redis.exists("foo")).to.be.a("number");
        redis.disconnect();
    });

    it("should reject when disconnected", async () => {
        const redis = new Redis();
        redis.disconnect();
        await assert.throws(async () => {
            await redis.get("foo");
        }, "Connection is closed");
        redis.disconnect();
    });

    it("should reject when enableOfflineQueue is disabled", async () => {
        const redis = new Redis({ enableOfflineQueue: false });
        await assert.throws(async () => {
            await redis.get("foo");
        }, "enableOfflineQueue options is false");
        redis.disconnect();
    });

    it("should support key prefixing", async () => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.set("bar", "baz");
        expect(await redis.get("bar")).to.be.equal("baz");
        expect(await redis.keys("*")).to.be.deep.equal(["foo:bar"]);
        redis.disconnect();
    });

    it("should support key prefixing with multiple keys", async () => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.lpush("app1", "test1");
        redis.lpush("app2", "test2");
        redis.lpush("app3", "test3");
        expect(await redis.blpop("app1", "app2", "app3", 0)).to.be.deep.equal(["foo:app1", "test1"]);
        expect(await redis.keys("*")).to.be.deep.equal(["foo:app2", "foo:app3"]);
        redis.disconnect();
    });

    it("should support key prefixing for zunionstore", async () => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.zadd("zset1", 1, "one");
        redis.zadd("zset1", 2, "two");
        redis.zadd("zset2", 1, "one");
        redis.zadd("zset2", 2, "two");
        redis.zadd("zset2", 3, "three");
        expect(await redis.zunionstore("out", 2, "zset1", "zset2", "WEIGHTS", 2, 3)).to.be.equal(3);
        expect(await redis.keys("*")).to.be.deep.equal(["foo:zset1", "foo:zset2", "foo:out"]);
        redis.disconnect();
    });

    it("should support key prefixing for sort", async () => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.hset("object_1", "name", "better");
        redis.hset("weight_1", "value", "20");
        redis.hset("object_2", "name", "best");
        redis.hset("weight_2", "value", "30");
        redis.hset("object_3", "name", "good");
        redis.hset("weight_3", "value", "10");
        redis.lpush("src", "1", "2", "3");
        await redis.sort("src", "BY", "weight_*->value", "GET", "object_*->name", "STORE", "dest");
        expect(await redis.lrange("dest", 0, -1)).to.be.deep.equal(["good", "better", "best"]);
        expect(await redis.keys("*")).to.have.members([
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
    });

    it("should allow sending the loading valid commands in connect event", async () => {
        const redis = new Redis({ enableOfflineQueue: false });
        await waitFor(redis, "connect");
        expect(await redis.select(2)).to.be.equal("OK");
        redis.disconnect();
    });

    it("should reject loading invalid commands in connect event", async () => {
        const redis = new Redis({ enableOfflineQueue: false });
        await waitFor(redis, "connect");
        await assert.throws(async () => {
            await redis.get("foo");
        }, "Stream isn't writeable and enableOfflineQueue options is false");
        redis.disconnect();
    });
});
