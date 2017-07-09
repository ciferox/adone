import check from "../helpers/check_redis";

describe("database", "redis", "transaction", { skip: check }, () => {
    const { is, database: { redis: { Redis, __: { Command } } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should works like pipeline by default", async () => {
        const redis = new Redis();
        expect(
            await redis.multi()
                .set("foo", "transaction")
                .get("foo")
                .exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "transaction"]
        ]);
        redis.disconnect();
    });

    it("should handle runtime errors correctly", async () => {
        const redis = new Redis();
        const result = await redis.multi()
            .set("foo", "bar")
            .lpush("foo", "abc")
            .exec();
        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.be.deep.equal([null, "OK"]);
        expect(result[1]).to.have.lengthOf(1);
        expect(result[1][0]).to.be.an("error");
        expect(result[1][0].message).to.include("wrong kind of value");
        redis.disconnect();
    });

    it("should handle compile-time errors correctly", async () => {
        const redis = new Redis();
        await assert.throws(async () => {
            await redis.multi().set("foo").get("foo").exec();
        }, "Transaction discarded because of previous errors");
        redis.disconnect();
    });

    it("should also support command callbacks", async () => {
        const redis = new Redis();
        const getFoo = spy();
        expect(
            await redis.multi().set("foo", "bar").get("foo", getFoo).exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "bar"]
        ]);
        expect(getFoo).to.have.been.calledOnce;
        expect(getFoo).to.have.been.calledWith(match(is.null), "QUEUED");
        redis.disconnect();
    });

    it("should also handle errors in command callbacks", async () => {
        const redis = new Redis();
        const setFoo = spy();
        await assert.throws(async () => {
            await redis.multi().set("foo", setFoo).exec();
        }, "Transaction discarded because of previous errors");
        expect(setFoo).to.have.been.calledOnce;
        expect(setFoo).to.have.been.calledWith(match((err) => err.message.includes("wrong number of arguments")));
        redis.disconnect();
    });

    it("should work without pipeline", async () => {
        const redis = new Redis();
        redis.multi({ pipeline: false });
        redis.set("foo", "bar");
        redis.get("foo");
        expect(await redis.exec()).to.be.deep.equal([
            [null, "OK"],
            [null, "bar"]
        ]);
        redis.disconnect();
    });

    describe("transformer", () => {
        it("should trigger transformer", async () => {
            const redis = new Redis({ dropBufferSupport: false });
            const data = { name: "Bob", age: "17" };
            const hgetallFoo = spy();
            const res = await redis.multi()
                .hmset("foo", data)
                .hgetall("foo", hgetallFoo)
                .hgetallBuffer("foo")
                .get("foo")
                .getBuffer("foo")
                .exec();
            expect(res[0][1]).to.eql("OK");
            expect(res[1][1]).to.eql(data);
            expect(res[2][1]).to.eql({
                name: Buffer.from("Bob"),
                age: Buffer.from("17")
            });
            expect(res[3][0]).to.have.property("message", "WRONGTYPE Operation against a key holding the wrong kind of value");
            expect(res[4][0]).to.have.property("message", "WRONGTYPE Operation against a key holding the wrong kind of value");
            expect(hgetallFoo).to.have.been.calledOnce;
            expect(hgetallFoo).to.have.been.calledWith(match(is.null), "QUEUED");
            redis.disconnect();
        });

        it("should trigger transformer inside pipeline", async () => {
            const redis = new Redis({ dropBufferSupport: false });
            const data = { name: "Bob", age: "17" };
            expect(
                await redis.pipeline()
                    .hmset("foo", data)
                    .multi()
                    .typeBuffer("foo")
                    .hgetall("foo")
                    .exec()
                    .hgetall("foo")
                    .exec()
            ).to.be.deep.equal([
                [null, "OK"],
                [null, "OK"],
                [null, Buffer.from("QUEUED")],
                [null, "QUEUED"],
                [null, [Buffer.from("hash"), data]],
                [null, data]
            ]);
            redis.disconnect();
        });

        it("should handle custom transformer exception", async () => {
            const transformError = "transformer error";
            Command._transformer.reply.get = function () {
                throw new Error(transformError);
            };
            const redis = new Redis();
            const res = await redis.multi().get("foo").exec();
            expect(res[0][0]).to.have.property("message", transformError);
            delete Command._transformer.reply.get;
            redis.disconnect();
        });
    });

    describe("addBatch", () => {
        it("should accept commands in constructor", async () => {
            const redis = new Redis();
            const getFoo = spy();
            expect(
                await redis.multi([
                    ["set", "foo", "bar"],
                    ["get", "foo", getFoo]
                ]).exec()
            ).to.be.deep.equal([
                [null, "OK"],
                [null, "bar"]
            ]);
            expect(getFoo).to.have.been.calledOnce;
            expect(getFoo).to.have.been.calledWith(match(is.null), "QUEUED");
            redis.disconnect();
        });
    });

    describe("exec", () => {
        it("should batch all commands before ready event", async () => {
            const redis = new Redis();
            await waitFor(redis, "connect");
            const res = await redis.multi().info().config("get", "maxmemory").exec();
            expect(res).to.have.lengthOf(2);
            expect(res[0][0]).to.be.null;
            expect(res[0][1]).to.be.a("string");
            expect(res[1][0]).to.be.null;
            expect(res[1][1]).to.be.an("array");
            redis.disconnect();
        });
    });
});
