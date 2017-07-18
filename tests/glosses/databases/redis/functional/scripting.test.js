import check from "../helpers/check_redis";

describe("database", "redis", "scripting", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    describe("numberOfKeys", () => {
        it("should recognize the numberOfKeys property", async () => {
            const redis = new Redis();
            redis.defineCommand("test", {
                numberOfKeys: 2,
                lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
            });
            expect(await redis.test("k1", "k2", "a1", "a2")).to.be.deep.equal(["k1", "k2", "a1", "a2"]);
            redis.disconnect();
        });

        it("should support dynamic key count", async () => {
            const redis = new Redis();
            redis.defineCommand("test", {
                lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
            });
            expect(await redis.test(2, "k1", "k2", "a1", "a2")).to.be.deep.equal(["k1", "k2", "a1", "a2"]);
            redis.disconnect();
        });

        it("should support numberOfKeys being 0", async () => {
            const redis = new Redis();
            redis.defineCommand("test", {
                numberOfKeys: 0,
                lua: "return {ARGV[1],ARGV[2]}"
            });
            expect(await redis.test("2", "a2")).to.be.deep.equal(["2", "a2"]);
            redis.disconnect();
        });

        it("should throw when numberOfKeys is omit", async () => {
            const redis = new Redis();
            redis.defineCommand("test", {
                lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
            });
            await assert.throws(async () => {
                await redis.test("k1", "k2", "a1", "a2");
            }, "value is not an integer");
            redis.disconnect();
        });
    });

    it("should have a buffer version", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.defineCommand("test", {
            numberOfKeys: 2,
            lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
        });
        expect(await redis.testBuffer("k1", "k2", "a1", "a2")).to.be.deep.equal(["k1", "k2", "a1", "a2"].map(Buffer.from));
        redis.disconnect();
    });

    it("should work well with pipeline", async () => {
        const redis = new Redis();
        redis.defineCommand("test", {
            numberOfKeys: 1,
            lua: "return redis.call(\"get\", KEYS[1])"
        });
        expect(
            await redis.pipeline()
                .set("test", "pipeline")
                .test("test")
                .exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "pipeline"]
        ]);
        redis.disconnect();
    });

    it("should following pipeline style when throw", async () => {
        const redis = new Redis();
        redis.defineCommand("test", {
            lua: "return redis.call(\"get\", KEYS[1])"
        });
        const result = await redis.pipeline().set("test", "pipeline").test("test").exec();
        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.be.deep.equal([null, "OK"]);
        expect(result[1]).to.have.lengthOf(1);
        expect(result[1][0]).to.be.an("error");
        expect(result[1][0].message).to.be.include("value is not an integer");
        redis.disconnect();
    });

    it("should use evalsha when script is loaded", async () => {
        const redis = new Redis();
        await waitFor(redis, "ready");
        redis.defineCommand("test", {
            lua: "return 1"
        });
        const monitor = await redis.monitor();
        const onMonitor = spy();
        monitor.on("monitor", onMonitor);
        await redis.test(0);
        redis.disconnect();
        if (!onMonitor.called) {
            await onMonitor.waitForCall();
        }
        expect(onMonitor).to.have.been.calledWith(match.any, match((cmd) => cmd[0] === "evalsha"));
        monitor.disconnect();
    });

    it("should try to use EVALSHA and fallback to EVAL if fails", async () => {
        const redis = new Redis();
        redis.defineCommand("test", {
            numberOfKeys: 1,
            lua: "return redis.call(\"get\", KEYS[1])"
        });
        await waitFor(redis, "ready");
        const flush = new Redis();
        await flush.script("flush");
        const expectedComands = ["evalsha", "eval", "get", "evalsha", "get"];
        const monitor = await redis.monitor();
        const onMonitor = spy();
        monitor.on("monitor", onMonitor);
        await Promise.all([
            redis.test("bar").then(() => redis.test("foo")),
            onMonitor.waitForNCalls(expectedComands.length)
        ]);
        for (let i = 0; i < expectedComands.length; ++i) {
            const { args: [, command] } = onMonitor.getCall(i);
            expect(command[0]).to.be.equal(expectedComands[i]);
        }
        monitor.disconnect();
        flush.disconnect();
        redis.disconnect();
    });

    it("should load scripts first before execute pipeline", async () => {
        const redis = new Redis();
        redis.defineCommand("testGet", {
            numberOfKeys: 1,
            lua: "return redis.call(\"get\", KEYS[1])"
        });
        await redis.testGet("init");
        redis.defineCommand("testSet", {
            numberOfKeys: 1,
            lua: "return redis.call(\"set\", KEYS[1], \"bar\")"
        });
        const expectedComands = ["script", "script", "evalsha", "get", "evalsha", "set", "get"];
        const monitor = await redis.monitor();
        const onMonitor = spy();
        monitor.on("monitor", onMonitor);
        const pipe = redis.pipeline();
        await Promise.all([
            pipe.testGet("foo").testSet("foo").get("foo").exec(),
            onMonitor.waitForNCalls(expectedComands.length)
        ]);
        for (let i = 0; i < expectedComands.length; ++i) {
            const { args: [, command] } = onMonitor.getCall(i);
            expect(command[0]).to.be.equal(expectedComands[i]);
        }
        monitor.disconnect();
        redis.disconnect();
    });

    it("should support key prefixing", async () => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.defineCommand("echo", {
            numberOfKeys: 2,
            lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
        });
        expect(await redis.echo("k1", "k2", "a1", "a2")).to.be.deep.equal(["foo:k1", "foo:k2", "a1", "a2"]);
        redis.disconnect();
    });
});
