import check from "../helpers/check_redis";

describe("database", "redis", "watch-exec", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    it("should support watch/exec transactions", async () => {
        const redis = new Redis();
        await redis.watch("watchkey");
        expect(await redis.multi().set("watchkey", "1").exec()).to.be.deep.equal([
            [null, "OK"]
        ]);
        redis.disconnect();
    });

    it("should support watch/exec transaction rollback", async () => {
        const redis1 = new Redis();
        const redis2 = new Redis();
        await redis1.watch("watchkey");
        await redis2.set("watchkey", "2");
        expect(await redis1.multi().set("watchkey", "1").exec()).to.be.null;
        redis1.disconnect();
        redis2.disconnect();
    });
});
