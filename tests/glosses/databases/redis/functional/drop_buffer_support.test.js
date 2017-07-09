import check from "../helpers/check_redis";

describe("database", "redis", "dropBufferSupport", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    it("should be disabled by default if the parser is javascript", () => {
        const redis = new Redis({ lazyConnect: true, parser: "javascript" });
        expect(redis.options).to.have.property("dropBufferSupport", false);
    });

    it("should be enabled by default if the parser is not javascript", () => {
        const redis = new Redis({ lazyConnect: true, parser: "hiredis" });
        expect(redis.options).to.have.property("dropBufferSupport", true);
    });

    it("should return strings correctly", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        expect(await redis.set("foo", Buffer.from("bar"))).to.be.equal("OK");
        expect(await redis.get("foo")).to.be.equal("bar");
        redis.disconnect();
    });

    context("enabled", () => {
        it("should reject the buffer commands", async () => {
            const redis = new Redis({ dropBufferSupport: true });
            await assert.throws(async () => {
                await redis.getBuffer("foo");
            }, "Buffer methods are not available");
            await assert.throws(async () => {
                await redis.callBuffer("get", "foo");
            }, "Buffer methods are not available");
            redis.disconnect();
        });

        it("should reject the custom buffer commands", async () => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.defineCommand("geteval", {
                numberOfKeys: 0,
                lua: "return \"string\""
            });
            await assert.throws(async () => {
                await redis.getevalBuffer();
            }, "Buffer methods are not available");
            redis.disconnect();
        });

        it("should return strings correctly", async () => {
            const redis = new Redis({ dropBufferSupport: true });
            expect(await redis.set("foo", Buffer.from("bar"))).to.be.equal("OK");
            expect(await redis.get("foo")).to.be.equal("bar");
            redis.disconnect();
        });

        it("should return strings for custom commands", async () => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.defineCommand("geteval", {
                numberOfKeys: 0,
                lua: "return \"string\""
            });
            expect(await redis.geteval()).to.be.equal("string");
            redis.disconnect();
        });

        it("should work with pipeline", async () => {
            const redis = new Redis({ dropBufferSupport: true });
            const pipeline = redis.pipeline();
            pipeline.set("foo", "bar");
            pipeline.get(Buffer.from("foo"));
            expect(await pipeline.exec()).to.be.deep.equal([
                [null, "OK"],
                [null, "bar"]
            ]);
            redis.disconnect();
        });

        it("should work with transaction", async () => {
            const redis = new Redis({ dropBufferSupport: true });
            expect(await redis.multi().set("foo", "bar").get("foo").exec()).to.be.deep.equal([
                [null, "OK"],
                [null, "bar"]
            ]);
            redis.disconnect();
        });

        it("should fail early with Buffer transaction", async () => {
            const redis = new Redis({ dropBufferSupport: true });
            await assert.throws(async () => {
                await redis.multi().set("foo", "bar").getBuffer(Buffer.from("foo"));
            }, "Buffer methods are not available");
            redis.disconnect();
        });

        it("should work with internal select command", async () => {
            const redis = new Redis({ dropBufferSupport: true, db: 1 });
            const check = new Redis({ db: 1 });
            await redis.set("foo", "bar");
            expect(await check.get("foo")).to.be.equal("bar");
            redis.disconnect();
            check.disconnect();
        });
    });
});
