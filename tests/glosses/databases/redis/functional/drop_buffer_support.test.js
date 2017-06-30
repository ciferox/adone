import check from "../helpers/check_redis";

describe("database", "redis", "dropBufferSupport", { skip: check }, () => {
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

    it("should be disabled by default if the parser is javascript", () => {
        const redis = new Redis({ lazyConnect: true, parser: "javascript" });
        expect(redis.options).to.have.property("dropBufferSupport", false);
    });

    it("should be enabled by default if the parser is not javascript", () => {
        const redis = new Redis({ lazyConnect: true, parser: "hiredis" });
        expect(redis.options).to.have.property("dropBufferSupport", true);
    });

    it("should return strings correctly", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        redis.set("foo", new Buffer("bar"), (err, res) => {
            expect(err).to.eql(null);
            expect(res).to.eql("OK");
            redis.get("foo", (err, res) => {
                expect(err).to.eql(null);
                expect(res).to.eql("bar");
                redis.disconnect();
                done();
            });
        });
    });

    context("enabled", () => {
        it("should reject the buffer commands", (done) => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.getBuffer("foo", (err) => {
                expect(err.message).to.match(/Buffer methods are not available/);

                redis.callBuffer("get", "foo", (err) => {
                    expect(err.message).to.match(/Buffer methods are not available/);
                    redis.disconnect();
                    done();
                });
            });
        });

        it("should reject the custom buffer commands", (done) => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.defineCommand("geteval", {
                numberOfKeys: 0,
                lua: "return \"string\""
            });
            redis.getevalBuffer((err) => {
                expect(err.message).to.match(/Buffer methods are not available/);
                redis.disconnect();
                done();
            });
        });

        it("should return strings correctly", (done) => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.set("foo", new Buffer("bar"), (err, res) => {
                expect(err).to.eql(null);
                expect(res).to.eql("OK");
                redis.get("foo", (err, res) => {
                    expect(err).to.eql(null);
                    expect(res).to.eql("bar");
                    redis.disconnect();
                    done();
                });
            });
        });

        it("should return strings for custom commands", (done) => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.defineCommand("geteval", {
                numberOfKeys: 0,
                lua: "return \"string\""
            });
            redis.geteval((err, res) => {
                expect(err).to.eql(null);
                expect(res).to.eql("string");
                redis.disconnect();
                done();
            });
        });

        it("should work with pipeline", (done) => {
            const redis = new Redis({ dropBufferSupport: true });
            const pipeline = redis.pipeline();
            pipeline.set("foo", "bar");
            pipeline.get(new Buffer("foo"));
            pipeline.exec((err, res) => {
                expect(err).to.eql(null);
                expect(res[0][1]).to.eql("OK");
                expect(res[1][1]).to.eql("bar");
                redis.disconnect();
                done();
            });
        });

        it("should work with transaction", (done) => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.multi()
                .set("foo", "bar")
                .get("foo")
                .exec((err, res) => {
                    expect(err).to.eql(null);
                    expect(res[0][1]).to.eql("OK");
                    expect(res[1][1]).to.eql("bar");
                    redis.disconnect();
                    done();
                });
        });

        it("should fail early with Buffer transaction", (done) => {
            const redis = new Redis({ dropBufferSupport: true });
            redis.multi()
                .set("foo", "bar")
                .getBuffer(new Buffer("foo"), (err) => {
                    expect(err.message).to.match(/Buffer methods are not available/);
                    redis.disconnect();
                    done();
                });
        });

        it("should work with internal select command", (done) => {
            const redis = new Redis({ dropBufferSupport: true, db: 1 });
            const check = new Redis({ db: 1 });
            redis.set("foo", "bar", () => {
                check.get("foo", (err, res) => {
                    expect(res).to.eql("bar");
                    redis.disconnect();
                    check.disconnect();
                    done();
                });
            });
        });
    });
});
