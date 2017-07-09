import check from "../helpers/check_redis";

describe("database", "redis", "transformer", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    describe("default transformer", () => {
        describe("hmset", () => {
            it("should support object", async () => {
                const redis = new Redis();
                expect(await redis.hmset("foo", { a: 1, b: "2" })).to.be.equal("OK");
                expect(await redis.hget("foo", "b")).to.be.equal("2");
                redis.disconnect();
            });

            it("should support Map", async () => {
                const redis = new Redis();
                const map = new Map();
                map.set("a", 1);
                map.set("b", "2");
                expect(await redis.hmset("foo", map)).to.be.equal("OK");
                expect(await redis.hget("foo", "b")).to.be.equal("2");
                redis.disconnect();
            });

            it("should not affect the old way", async () => {
                const redis = new Redis();
                expect(await redis.hmset("foo", "a", 1, "b", "2")).to.be.equal("OK");
                expect(await redis.hget("foo", "b")).to.be.equal("2");
                redis.disconnect();
            });
        });

        describe("mset", () => {
            it("should support object", async () => {
                const redis = new Redis();
                expect(await redis.mset({ a: 1, b: "2" })).to.be.equal("OK");
                expect(await redis.mget("a", "b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
            });

            it("should support Map", async () => {
                const redis = new Redis();
                const map = new Map();
                map.set("a", 1);
                map.set("b", "2");
                expect(await redis.mset(map)).to.be.equal("OK");
                expect(await redis.mget("a", "b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
            });

            it("should not affect the old way", async () => {
                const redis = new Redis();
                expect(await redis.mset("a", 1, "b", "2")).to.be.equal("OK");
                expect(await redis.mget("a", "b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
            });

            it("should work with keyPrefix option", async () => {
                const redis = new Redis({ keyPrefix: "foo:" });
                expect(await redis.mset({ a: 1, b: "2" })).to.be.equal("OK");
                const otherRedis = new Redis();
                expect(await otherRedis.mget("foo:a", "foo:b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
                otherRedis.disconnect();
            });
        });

        describe("msetnx", () => {
            it("should support object", async () => {
                const redis = new Redis();
                expect(await redis.msetnx({ a: 1, b: "2" })).to.be.equal(1);
                expect(await redis.mget("a", "b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
            });

            it("should support Map", async () => {
                const redis = new Redis();
                const map = new Map();
                map.set("a", 1);
                map.set("b", "2");
                expect(await redis.msetnx(map)).to.be.equal(1);
                expect(await redis.mget("a", "b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
            });

            it("should not affect the old way", async () => {
                const redis = new Redis();
                expect(await redis.msetnx("a", 1, "b", "2")).to.be.equal(1);
                expect(await redis.mget("a", "b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
            });

            it("should work with keyPrefix option", async () => {
                const redis = new Redis({ keyPrefix: "foo:" });
                expect(await redis.msetnx({ a: 1, b: "2" })).to.be.equal(1);
                const otherRedis = new Redis();
                expect(await otherRedis.mget("foo:a", "foo:b")).to.be.deep.equal(["1", "2"]);
                redis.disconnect();
                otherRedis.disconnect();
            });
        });

        describe("hgetall", () => {
            it("should return an object", async () => {
                const redis = new Redis();
                await redis.hmset("foo", "k1", "v1", "k2", "v2");
                expect(await redis.hgetall("foo")).to.be.deep.equal({
                    k1: "v1",
                    k2: "v2"
                });
                redis.disconnect();
            });

            it("should return {} when key not exists", async () => {
                const redis = new Redis();
                expect(await redis.hgetall("foo")).to.be.deep.equal({});
                redis.disconnect();
            });
        });
    });
});
