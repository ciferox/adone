import check from "../helpers/check_redis";

describe("database", "redis", "fatal_error", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, event) => new Promise((resolve) => emitter.once(event, resolve));

    it("should handle fatal error of parser", async () => {
        const redis = new Redis();
        await waitFor(redis, "ready");
        const execute = redis.replyParser.execute;
        redis.replyParser.execute = function () {
            execute.call(this, "&");
        };
        await assert.throws(async () => {
            await redis.get("foo");
        }, "Protocol error");
        redis.replyParser.execute = execute;
        await redis.get("bar");
        redis.disconnect();
    });
});
