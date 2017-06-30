import check from "../helpers/check_redis";

describe("database", "redis", "transformer", { skip: check }, () => {
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

    describe("default transformer", () => {
        describe("hmset", () => {
            it("should support object", (done) => {
                const redis = new Redis();
                redis.hmset("foo", { a: 1, b: "2" }, (err, result) => {
                    expect(result).to.eql("OK");
                    redis.hget("foo", "b", (err, result) => {
                        expect(result).to.eql("2");
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should support Map", (done) => {
                if (typeof Map === "undefined") {
                    return done();
                }
                const redis = new Redis();
                const map = new Map();
                map.set("a", 1);
                map.set("b", "2");
                redis.hmset("foo", map, (err, result) => {
                    expect(result).to.eql("OK");
                    redis.hget("foo", "b", (err, result) => {
                        expect(result).to.eql("2");
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should not affect the old way", (done) => {
                const redis = new Redis();
                redis.hmset("foo", "a", 1, "b", "2", (err, result) => {
                    expect(result).to.eql("OK");
                    redis.hget("foo", "b", (err, result) => {
                        expect(result).to.eql("2");
                        redis.disconnect();
                        done();
                    });
                });
            });
        });

        describe("mset", () => {
            it("should support object", (done) => {
                const redis = new Redis();
                redis.mset({ a: 1, b: "2" }, (err, result) => {
                    expect(result).to.eql("OK");
                    redis.mget("a", "b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should support Map", (done) => {
                if (typeof Map === "undefined") {
                    return done();
                }
                const redis = new Redis();
                const map = new Map();
                map.set("a", 1);
                map.set("b", "2");
                redis.mset(map, (err, result) => {
                    expect(result).to.eql("OK");
                    redis.mget("a", "b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should not affect the old way", (done) => {
                const redis = new Redis();
                redis.mset("a", 1, "b", "2", (err, result) => {
                    expect(result).to.eql("OK");
                    redis.mget("a", "b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should work with keyPrefix option", (done) => {
                const redis = new Redis({ keyPrefix: "foo:" });
                redis.mset({ a: 1, b: "2" }, (err, result) => {
                    expect(result).to.eql("OK");
                    const otherRedis = new Redis();
                    otherRedis.mget("foo:a", "foo:b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        otherRedis.disconnect();
                        done();
                    });
                });
            });
        });

        describe("msetnx", () => {
            it("should support object", (done) => {
                const redis = new Redis();
                redis.msetnx({ a: 1, b: "2" }, (err, result) => {
                    expect(result).to.eql(1);
                    redis.mget("a", "b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should support Map", (done) => {
                if (typeof Map === "undefined") {
                    return done();
                }
                const redis = new Redis();
                const map = new Map();
                map.set("a", 1);
                map.set("b", "2");
                redis.msetnx(map, (err, result) => {
                    expect(result).to.eql(1);
                    redis.mget("a", "b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should not affect the old way", (done) => {
                const redis = new Redis();
                redis.msetnx("a", 1, "b", "2", (err, result) => {
                    expect(result).to.eql(1);
                    redis.mget("a", "b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        done();
                    });
                });
            });
            it("should work with keyPrefix option", (done) => {
                const redis = new Redis({ keyPrefix: "foo:" });
                redis.msetnx({ a: 1, b: "2" }, (err, result) => {
                    expect(result).to.eql(1);
                    const otherRedis = new Redis();
                    otherRedis.mget("foo:a", "foo:b", (err, result) => {
                        expect(result).to.eql(["1", "2"]);
                        redis.disconnect();
                        otherRedis.disconnect();
                        done();
                    });
                });
            });
        });

        describe("hgetall", () => {
            it("should return an object", (done) => {
                const redis = new Redis();
                redis.hmset("foo", "k1", "v1", "k2", "v2", () => {
                    redis.hgetall("foo", (err, result) => {
                        expect(result).to.eql({ k1: "v1", k2: "v2" });
                        redis.disconnect();
                        done();
                    });
                });
            });

            it("should return {} when key not exists", (done) => {
                const redis = new Redis();
                redis.hgetall("foo", (err, result) => {
                    expect(result).to.eql({});
                    redis.disconnect();
                    done();
                });
            });
        });
    });
});
