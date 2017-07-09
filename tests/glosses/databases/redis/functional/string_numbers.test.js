import check from "../helpers/check_redis";

describe("database", "redis", "stringNumbers", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;
    const MAX_NUMBER = Number.MAX_SAFE_INTEGER; // Number.MAX_SAFE_INTEGER

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    context("enabled", () => {
        it("returns numbers as strings", async () => {
            const redis = new Redis({
                stringNumbers: true
            });
            redis.set("foo", MAX_NUMBER);
            expect(await redis.incr("foo")).to.be.equal("9007199254740992");
            expect(await redis.incr("foo")).to.be.equal("9007199254740993");
            expect(await redis.incr("foo")).to.be.equal("9007199254740994");
            // also works for small interger
            redis.set("foo", 123);
            expect(await redis.incr("foo")).to.be.equal("124");
            // and floats
            await redis.set("foo", 123.23);
            expect(await redis.incrbyfloat("foo", 1.2)).to.be.equal("124.43");
            redis.disconnect();
        });
    });

    context("disabled", () => {
        it("returns numbers", async () => {
            const redis = new Redis();
            redis.set("foo", "123");
            expect(await redis.incr("foo")).to.be.equal(124);
            redis.disconnect();
        });
    });
});
