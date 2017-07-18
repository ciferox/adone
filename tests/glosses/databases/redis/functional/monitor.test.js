import check from "../helpers/check_redis";

describe("database", "redis", "monitor", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should receive commands", async () => {
        const redis = new Redis();
        const monitor = await redis.monitor();
        const onMonitor = spy();
        monitor.on("monitor", onMonitor);
        const monitorCall = onMonitor.waitForCall();
        await redis.get("foo");
        await monitorCall;
        expect(onMonitor).to.have.been.calledWith(match.any, ["get", "foo"]);
        monitor.disconnect();
        redis.disconnect();
    });

    it("should reject processing commands", async () => {
        const redis = new Redis();
        const monitor = await redis.monitor();
        await assert.throws(async () => {
            await monitor.get("foo");
        }, "Connection is in monitoring mode");
        redis.disconnect();
        monitor.disconnect();
    });

    it("should continue monitoring after reconnection", async () => {
        const redis = new Redis();
        const monitor = await redis.monitor();
        const onMonitor = spy();
        monitor.on("monitor", onMonitor);
        monitor.disconnect(true);
        monitor.on("ready", () => {
            redis.set("foo", "bar");
        });
        await onMonitor.waitForCall();
        expect(onMonitor).to.have.been.calledWith(match.any, ["set", "foo", "bar"]);
        redis.disconnect();
        monitor.disconnect();
    });

    it("should wait for the ready event before monitoring", async () => {
        const redis = new Redis();
        await waitFor(redis, "ready");
        const readyCheck = stub(Redis.prototype, "_readyCheck").callsFake(function (...args) {
            Redis.prototype._readyCheck.restore();
            return Redis.prototype._readyCheck.apply(this, args);
        });
        const monitor = await redis.monitor();
        expect(readyCheck).to.have.been.called;
        redis.disconnect();
        monitor.disconnect();
    });
});
