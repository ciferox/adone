import check from "../helpers/check_redis";

skip(check);

describe("glosses", "databases", "redis", "pipeline", () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach((done) => {
        const redis = new Redis();
        redis.flushall(() => {
            redis.script("flush", () => {
                redis.disconnect();
                done();
            });
        });
    });

    it("should return correct result", (done) => {
        const redis = new Redis();
        redis.pipeline().set("foo", "1").get("foo").set("foo", "2").incr("foo").get("foo").exec((err, results) => {
            expect(err).to.eql(null);
            expect(results).to.eql([
                [null, "OK"],
                [null, "1"],
                [null, "OK"],
                [null, 3],
                [null, "3"]
            ]);
            redis.disconnect();
            done();
        });
    });

    it("should return an empty array on empty pipeline", (done) => {
        const redis = new Redis();
        redis.pipeline().exec((err, results) => {
            expect(err).to.eql(null);
            expect(results).to.eql([]);
            redis.disconnect();
            done();
        });
    });

    it("should support mix string command and buffer command", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.pipeline().set("foo", "bar")
            .set("foo", new Buffer("bar")).getBuffer("foo")
            .get(new Buffer("foo"))
            .exec((err, results) => {
                expect(err).to.eql(null);
                expect(results).to.eql([
                    [null, "OK"],
                    [null, "OK"],
                    [null, new Buffer("bar")],
                    [null, "bar"]
                ]);
                redis.disconnect();
                done();
            });
    });

    it("should handle error correctly", (done) => {
        const redis = new Redis();
        redis.pipeline().set("foo").exec((err, results) => {
            expect(err).to.eql(null);
            expect(results.length).to.eql(1);
            expect(results[0].length).to.eql(1);
            expect(results[0][0].toString()).to.match(/wrong number of arguments/);
            redis.disconnect();
            done();
        });
    });

    it("should also invoke the command's callback", (done) => {
        const redis = new Redis();
        let pending = 1;
        redis.pipeline().set("foo", "bar").get("foo", (err, result) => {
            expect(result).to.eql("bar");
            pending -= 1;
        }).exec((err, results) => {
            expect(pending).to.eql(0);
            expect(results[1][1]).to.eql("bar");
            redis.disconnect();
            done();
        });
    });

    it("should support inline transaction", (done) => {
        const redis = new Redis();

        redis.pipeline().multi().set("foo", "bar").get("foo").exec().exec((err, result) => {
            expect(result[0][1]).to.eql("OK");
            expect(result[1][1]).to.eql("QUEUED");
            expect(result[2][1]).to.eql("QUEUED");
            expect(result[3][1]).to.eql(["OK", "bar"]);
            redis.disconnect();
            done();
        });
    });

    it("should have the same options as its container", () => {
        const redis = new Redis({ showFriendlyErrorStack: true });
        const pipeline = redis.pipeline();
        expect(pipeline.options).to.have.property("showFriendlyErrorStack", true);
        redis.disconnect();
    });

    it("should support key prefixing", (done) => {
        const redis = new Redis({ keyPrefix: "foo:" });
        redis.pipeline().set("bar", "baz").get("bar").lpush("app1", "test1")
            .lpop("app1").keys("*").exec((err, results) => {
                expect(err).to.eql(null);
                expect(results).to.eql([
                    [null, "OK"],
                    [null, "baz"],
                    [null, 1],
                    [null, "test1"],
                    [null, ["foo:bar"]]
                ]);
                redis.disconnect();
                done();
            });
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

        it("should work", (done) => {
            redis.pipeline().echo("foo", "bar", "123", "abc").exec((err, results) => {
                expect(err).to.eql(null);
                expect(results).to.eql([
                    [null, ["foo", "bar", "123", "abc"]]
                ]);
                done();
            });
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

        it("should be supported in transaction blocks", (done) => {
            redis.pipeline()
                .multi()
                .set("foo", "asdf")
                .echo("bar", "baz", "123", "abc")
                .get("foo")
                .exec()
                .exec((err, results) => {
                    expect(err).to.eql(null);
                    expect(results[4][1][1]).to.eql(["bar", "baz", "123", "abc"]);
                    expect(results[4][1][2]).to.eql("asdf");
                    done();
                });
        });
    });

    describe("#addBatch", () => {
        it("should accept commands in constructor", (done) => {
            const redis = new Redis();
            let pending = 1;
            redis.pipeline([
                ["set", "foo", "bar"],
                ["get", "foo", function (err, result) {
                    expect(result).to.eql("bar");
                    pending -= 1;
                }]
            ]).exec((err, results) => {
                expect(pending).to.eql(0);
                expect(results[1][1]).to.eql("bar");
                redis.disconnect();
                done();
            });
        });
    });

    describe("exec", () => {
        it("should group results", (done) => {
            const redis = new Redis();
            redis.multi({ pipeline: false });
            redis.set("foo", "bar");
            redis.get("foo");
            redis.exec().then(() => {
                redis.disconnect();
                done();
            });
        });

        it("should allow omitting callback", (done) => {
            const redis = new Redis();
            redis.exec().catch((err) => {
                expect(err.message).to.eql("ERR EXEC without MULTI");
                redis.disconnect();
                done();
            });
        });

        it("should batch all commands before ready event", (done) => {
            const redis = new Redis();
            redis.on("connect", () => {
                redis.pipeline().info().config("get", "maxmemory").exec((err, res) => {
                    expect(err).to.eql(null);
                    expect(res).to.have.lengthOf(2);
                    expect(res[0][0]).to.eql(null);
                    expect(typeof res[0][1]).to.eql("string");
                    expect(res[1][0]).to.eql(null);
                    expect(Array.isArray(res[1][1])).to.eql(true);
                    redis.disconnect();
                    done();
                });
            });
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
