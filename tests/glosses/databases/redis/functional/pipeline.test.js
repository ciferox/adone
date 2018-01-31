import check from "../helpers/check_redis";

describe("database", "redis", "pipeline", { skip: check }, () => {
    const { is, database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should return correct result", async () => {
        const redis = new Redis();
        expect(
            await redis.pipeline()
                .set("foo", "1")
                .get("foo")
                .set("foo", "2")
                .incr("foo")
                .get("foo")
                .exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "1"],
            [null, "OK"],
            [null, 3],
            [null, "3"]
        ]);
        redis.disconnect();
    });

    it("should return an empty array on empty pipeline", async () => {
        const redis = new Redis();
        expect(await redis.pipeline().exec()).to.be.deep.equal([]);
        redis.disconnect();
    });

    it("should support mix string command and buffer command", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        expect(
            await redis.pipeline()
                .set("foo", "bar")
                .set("foo", Buffer.from("bar"))
                .getBuffer("foo")
                .get(Buffer.from("foo"))
                .exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "OK"],
            [null, Buffer.from("bar")],
            [null, "bar"]
        ]);
        redis.disconnect();
    });

    it("should handle error correctly", async () => {
        const redis = new Redis();
        const result = await redis.pipeline().set("foo").exec();
        expect(result).to.have.lengthOf(1);
        expect(result[0]).to.have.lengthOf(1);
        expect(result[0][0]).to.be.an("error");
        expect(result[0][0].message).to.include("wrong number of arguments");
        redis.disconnect();
    });

    it("should also invoke the command's callback", async () => {
        const redis = new Redis();
        const getFoo = spy();
        expect(
            await redis.pipeline()
                .set("foo", "bar")
                .get("foo", getFoo)
                .exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "bar"]
        ]);
        expect(getFoo).to.have.been.calledOnce();
        expect(getFoo).to.have.been.calledWith(match(is.null), "bar");
        redis.disconnect();
    });

    it("should support inline transaction", async () => {
        const redis = new Redis();
        expect(
            await redis.pipeline()
                .multi()
                .set("foo", "bar")
                .get("foo")
                .exec()
                .exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "QUEUED"],
            [null, "QUEUED"],
            [null, ["OK", "bar"]]
        ]);
        redis.disconnect();
    });

    it("should have the same options as its container", () => {
        const redis = new Redis({ showFriendlyErrorStack: true });
        const pipeline = redis.pipeline();
        expect(pipeline.options).to.have.property("showFriendlyErrorStack", true);
        redis.disconnect();
    });

    it("should support key prefixing", async () => {
        const redis = new Redis({ keyPrefix: "foo:" });
        expect(
            await redis.pipeline()
                .set("bar", "baz")
                .get("bar")
                .lpush("app1", "test1")
                .lpop("app1")
                .keys("*")
                .exec()
        ).to.be.deep.equal([
            [null, "OK"],
            [null, "baz"],
            [null, 1],
            [null, "test1"],
            [null, ["foo:bar"]]
        ]);
        redis.disconnect();
    });

    describe("custom commands", () => {
        let redis;

        before(() => {
            redis = new Redis();
            redis.defineCommand("echo", {
                numberOfKeys: 2,
                lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
            });
        });

        after(() => {
            redis.disconnect();
        });

        it("should work", async () => {
            expect(
                await redis.pipeline()
                    .echo("foo", "bar", "123", "abc")
                    .exec()
            ).to.be.deep.equal([
                [null, ["foo", "bar", "123", "abc"]]
            ]);
        });

        it("should support callbacks", (done) => {
            let pending = 1;
            redis.pipeline()
                .echo("foo", "bar", "123", "abc", (err, result) => {
                    pending -= 1;
                    expect(err).to.eql(null);
                    expect(result).to.eql(["foo", "bar", "123", "abc"]);
                })
                .exec((err, results) => {
                    expect(err).to.eql(null);
                    expect(results).to.eql([
                        [null, ["foo", "bar", "123", "abc"]]
                    ]);
                    expect(pending).to.eql(0);
                    done();
                });
        });

        it("should be supported in transaction blocks", async () => {
            expect(
                await redis.pipeline()
                    .multi()
                    .set("foo", "asdf")
                    .echo("bar", "baz", "123", "abc")
                    .get("foo")
                    .exec()
                    .exec()
            ).to.be.deep.equal([
                [null, "OK"],
                [null, "QUEUED"],
                [null, "QUEUED"],
                [null, "QUEUED"],
                [null, ["OK", ["bar", "baz", "123", "abc"], "asdf"]]
            ]);
        });
    });

    describe("addBatch", () => {
        it("should accept commands in constructor", async () => {
            const redis = new Redis();
            const getFoo = spy();
            expect(
                await redis.pipeline([
                    ["set", "foo", "bar"],
                    ["get", "foo", getFoo]
                ]).exec()
            ).to.be.deep.equal([
                [null, "OK"],
                [null, "bar"]
            ]);
            expect(getFoo).to.have.been.calledOnce();
            expect(getFoo).to.have.been.calledWith(match(is.null), "bar");
            redis.disconnect();
        });
    });

    describe("exec", () => {
        it("should group results", async () => {
            const redis = new Redis();
            redis.multi({ pipeline: false });
            redis.set("foo", "bar");
            redis.get("foo");
            expect(await redis.exec()).to.be.deep.equal([[null, "OK"], [null, "bar"]]);
            redis.disconnect();
        });

        it("should allow omitting callback", (done) => {
            const redis = new Redis();
            redis.exec().catch((err) => {
                expect(err.message).to.eql("ERR EXEC without MULTI");
                redis.disconnect();
                done();
            });
        });

        it("should batch all commands before ready event", async () => {
            const redis = new Redis();
            await waitFor(redis, "connect");
            const res = await redis.pipeline()
                .info()
                .config("get", "maxmemory")
                .exec();
            expect(res).to.have.lengthOf(2);
            expect(res[0][0]).to.be.null();
            expect(res[0][1]).to.be.a("string");
            expect(res[1][0]).to.be.null();
            expect(res[1][1]).to.be.an("array");
            redis.disconnect();
        });
    });

    describe("length", () => {
        it("return the command count", () => {
            const redis = new Redis();

            const pipeline1 = redis.pipeline().multi().set("foo", "bar").get("foo").exec();
            expect(pipeline1.length).to.eql(4);

            const pipeline2 = redis.pipeline([
                ["set", "foo", "bar"],
                ["get", "foo"]
            ]);
            expect(pipeline2.length).to.eql(2);
        });
    });
});
