import check from "../helpers/check_redis";

describe("database", "redis", "scripting", { skip: check }, () => {
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

    describe("#numberOfKeys", () => {
        it("should recognize the numberOfKeys property", (done) => {
            const redis = new Redis();

            redis.defineCommand("test", {
                numberOfKeys: 2,
                lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
            });

            redis.test("k1", "k2", "a1", "a2", (err, result) => {
                expect(result).to.eql(["k1", "k2", "a1", "a2"]);
                redis.disconnect();
                done();
            });
        });

        it("should support dynamic key count", (done) => {
            const redis = new Redis();

            redis.defineCommand("test", {
                lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
            });

            redis.test(2, "k1", "k2", "a1", "a2", (err, result) => {
                expect(result).to.eql(["k1", "k2", "a1", "a2"]);
                redis.disconnect();
                done();
            });
        });

        it("should support numberOfKeys being 0", (done) => {
            const redis = new Redis();

            redis.defineCommand("test", {
                numberOfKeys: 0,
                lua: "return {ARGV[1],ARGV[2]}"
            });

            redis.test("2", "a2", (err, result) => {
                expect(result).to.eql(["2", "a2"]);
                redis.disconnect();
                done();
            });
        });

        it("should throw when numberOfKeys is omit", (done) => {
            const redis = new Redis();

            redis.defineCommand("test", {
                lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
            });

            redis.test("k1", "k2", "a1", "a2", (err, result) => {
                expect(err).to.be.instanceof(Error);
                expect(err.toString()).to.match(/value is not an integer/);
                redis.disconnect();
                done();
            });
        });
    });

    it("should have a buffer version", (done) => {
        const redis = new Redis({ dropBufferSupport: false });

        redis.defineCommand("test", {
            numberOfKeys: 2,
            lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
        });

        redis.testBuffer("k1", "k2", "a1", "a2", (err, result) => {
            expect(result).to.eql([new Buffer("k1"), new Buffer("k2"), new Buffer("a1"), new Buffer("a2")]);
            redis.disconnect();
            done();
        });
    });

    it("should work well with pipeline", (done) => {
        const redis = new Redis();

        redis.defineCommand("test", {
            numberOfKeys: 1,
            lua: "return redis.call(\"get\", KEYS[1])"
        });

        redis.pipeline().set("test", "pipeline").test("test").exec((err, results) => {
            expect(results).to.eql([[null, "OK"], [null, "pipeline"]]);
            redis.disconnect();
            done();
        });
    });

    it("should following pipeline style when throw", (done) => {
        const redis = new Redis();

        redis.defineCommand("test", {
            lua: "return redis.call(\"get\", KEYS[1])"
        });

        redis.pipeline().set("test", "pipeline").test("test").exec((err, results) => {
            expect(err).to.eql(null);
            expect(results[1][0]).to.be.instanceof(Error);
            expect(results[1][0].toString()).to.match(/value is not an integer/);
            redis.disconnect();
            done();
        });
    });

    it("should use evalsha when script is loaded", (done) => {
        const redis = new Redis();

        redis.on("ready", () => {
            redis.defineCommand("test", {
                lua: "return 1"
            });
            redis.monitor((err, monitor) => {
                let sent = false;
                monitor.on("monitor", (_, command) => {
                    if (!sent) {
                        sent = true;
                        expect(command[0]).to.eql("evalsha");
                        monitor.disconnect();
                        done();
                    }
                });
                redis.test(0, () => {
                    redis.disconnect();
                });
            });
        });
    });

    it("should try to use EVALSHA and fallback to EVAL if fails", (done) => {
        const redis = new Redis();

        redis.defineCommand("test", {
            numberOfKeys: 1,
            lua: "return redis.call(\"get\", KEYS[1])"
        });

        redis.once("ready", () => {
            const flush = new Redis();
            flush.script("flush", () => {
                const expectedComands = ["evalsha", "eval", "get", "evalsha", "get"];
                redis.monitor((err, monitor) => {
                    monitor.on("monitor", (_, command) => {
                        const name = expectedComands.shift();
                        expect(name).to.eql(command[0]);
                        if (!expectedComands.length) {
                            monitor.disconnect();
                            flush.disconnect();
                            redis.disconnect();
                            done();
                        }
                    });
                    redis.test("bar", () => {
                        redis.test("foo");
                    });
                });
            });
        });
    });

    it("should load scripts first before execute pipeline", (done) => {
        const redis = new Redis();

        redis.defineCommand("testGet", {
            numberOfKeys: 1,
            lua: "return redis.call(\"get\", KEYS[1])"
        });

        redis.testGet("init", () => {
            redis.defineCommand("testSet", {
                numberOfKeys: 1,
                lua: "return redis.call(\"set\", KEYS[1], \"bar\")"
            });
            const expectedComands = ["script", "script", "evalsha", "get", "evalsha", "set", "get"];
            redis.monitor((err, monitor) => {
                monitor.on("monitor", (_, command) => {
                    const name = expectedComands.shift();
                    expect(name).to.eql(command[0]);
                    if (!expectedComands.length) {
                        monitor.disconnect();
                        redis.disconnect();
                        done();
                    }
                });
                const pipe = redis.pipeline();
                pipe.testGet("foo").testSet("foo").get("foo").exec();
            });
        });
    });

    it("should support key prefixing", (done) => {
        const redis = new Redis({ keyPrefix: "foo:" });

        redis.defineCommand("echo", {
            numberOfKeys: 2,
            lua: "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}"
        });

        redis.echo("k1", "k2", "a1", "a2", (err, result) => {
            expect(result).to.eql(["foo:k1", "foo:k2", "a1", "a2"]);
            redis.disconnect();
            done();
        });
    });
});
