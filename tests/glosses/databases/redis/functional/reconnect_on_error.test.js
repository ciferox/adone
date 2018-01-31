import check from "../helpers/check_redis";

describe("database", "redis", "reconnectOnError", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should pass the error as the first param", async () => {
        const checkError = stub().callsFake((err) => {
            expect(err.name).to.be.equal("ReplyError");
            expect(err.command.name).to.be.equal("set");
            expect(err.command.args).to.be.deep.equal(["foo"]);
        });
        const redis = new Redis({
            reconnectOnError: checkError
        });

        checkError(await assert.throws(async () => {
            await redis.set("foo");
        }));
        expect(checkError).to.have.been.calledTwice();
    });

    it("should not reconnect if reconnectOnError returns false", async () => {
        const redis = new Redis({
            reconnectOnError() {
                return false;
            }
        });
        const disconnect = stub(redis, "disconnect").throws(new Error("should not disconnect"));
        await assert.throws(async () => {
            await redis.set("foo");
        });
        disconnect.restore();
        await redis.disconnect();
    });

    it("should reconnect if reconnectOnError returns true or 1", async () => {
        const redis = new Redis({
            reconnectOnError() {
                return true;
            }
        });
        await assert.throws(async () => {
            await redis.set("foo");
        });
        await waitFor(redis, "ready");
        redis.disconnect();
    });

    it("should reconnect and retry the command if reconnectOnError returns 2", async () => {
        const redis = new Redis({
            reconnectOnError() {
                redis.del("foo");
                return 2;
            }
        });

        redis.set("foo", "bar");
        expect(await redis.sadd("foo", "a")).to.be.equal(1);
        redis.disconnect();
    });

    it("should select the currect database", async () => {
        const redis = new Redis({
            reconnectOnError() {
                redis.select(3);
                redis.del("foo");
                redis.select(0);
                return 2;
            }
        });

        redis.select(3);
        redis.set("foo", "bar");
        expect(await redis.sadd("foo", "a")).to.be.equal(1);
        redis.select(3);
        expect(await redis.type("foo")).to.be.equal("set");
        redis.disconnect();
    });

    it("should work with pipeline", async () => {
        const redis = new Redis({
            reconnectOnError() {
                redis.del("foo");
                return 2;
            }
        });

        redis.set("foo", "bar");
        expect(
            await redis.pipeline()
                .get("foo")
                .sadd("foo", "a")
                .exec()
        ).to.be.deep.equal([
            [null, "bar"],
            [null, 1]
        ]);
        redis.disconnect();
    });
});
