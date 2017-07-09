import check from "../helpers/check_redis";

describe("database", "redis", "select", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should support auto select", async () => {
        const redis = new Redis({ db: 2 });
        redis.set("foo", "2");
        redis.select("2");
        expect(await redis.get("foo")).to.be.equal("2");
        redis.disconnect();
    });

    it("should resend commands to the correct db", async () => {
        const redis = new Redis();
        await waitFor(redis, "ready");
        await redis.set("foo", "2");
        redis.stream.destroy();
        redis.select("3");
        redis.set("foo", "3");
        redis.select("0");
        expect(await redis.get("foo")).to.be.equal("2");
        redis.select("3");
        expect(await redis.get("foo")).to.be.equal("3");
        redis.disconnect();
    });

    it("should re-select the current db when reconnect", async () => {
        const redis = new Redis();
        await waitFor(redis, "ready");
        redis.set("foo", "bar");
        redis.select(2);
        await redis.set("foo", "2");
        redis.stream.destroy();
        expect(await redis.get("foo")).to.be.equal("2");
        redis.disconnect();
    });

    it("should emit \"select\" event when db changes", async () => {
        const changes = [];
        const redis = new Redis();
        redis.on("select", (db) => {
            changes.push(db);
        });
        await redis.select("2");
        expect(changes).to.be.deep.equal([2]);
        await redis.select("4");
        expect(changes).to.be.deep.equal([2, 4]);
        await redis.select("4");
        expect(changes).to.be.deep.equal([2, 4]);
        redis.disconnect();
    });

    it("should be sent on the connect event", (done) => {
        const redis = new Redis({ db: 2 });
        const select = redis.select;
        redis.select = function (...args) {
            return select.apply(redis, args).then(() => {
                redis.select = select;
                redis.disconnect();
                done();
            });
        };
        redis.on("connect", () => {
            redis.subscribe("anychannel");
        });
    });
});
