import check from "../helpers/check_redis";

describe("database", "redis", "lazy connect", { skip: check }, () => {
    const { database: { redis: { Redis, Cluster } } } = adone;

    afterEach((done) => {
        const redis = new Redis();
        redis.flushall(() => {
            redis.script("flush", () => {
                redis.disconnect();
                done();
            });
        });
    });

    it("should not call `connect` when init", () => {
        stub(Redis.prototype, "connect").throws(new Error("`connect` should not be called"));
        new Redis({ lazyConnect: true });
        Redis.prototype.connect.restore();
    });

    it("should connect when calling a command", (done) => {
        const redis = new Redis({ lazyConnect: true });
        redis.set("foo", "bar");
        redis.get("foo", (err, result) => {
            expect(result).to.eql("bar");
            redis.disconnect();
            done();
        });
    });

    it("should not try to reconnect when disconnected manually", (done) => {
        const redis = new Redis({ lazyConnect: true });
        redis.get("foo", () => {
            redis.disconnect();
            redis.get("foo", (err) => {
                expect(err.message).to.match(/Connection is closed/);
                done();
            });
        });
    });

    it("should be able to disconnect", (done) => {
        const redis = new Redis({ lazyConnect: true });
        redis.on("end", () => {
            done();
        });
        redis.disconnect();
    });

    describe("Cluster", () => {
        it("should not call `connect` when init", () => {
            stub(Cluster.prototype, "connect").throws(new Error("`connect` should not be called"));
            new Cluster([], { lazyConnect: true });
            Cluster.prototype.connect.restore();
        });

        it("should quit before \"close\" being emited", (done) => {
            stub(Cluster.prototype, "connect").throws(new Error("`connect` should not be called"));
            const cluster = new Cluster([], { lazyConnect: true });
            cluster.quit(() => {
                cluster.once("close", () => {
                    cluster.once("end", () => {
                        Cluster.prototype.connect.restore();
                        done();
                    });
                });
            });
        });

        it("should disconnect before \"close\" being emited", (done) => {
            stub(Cluster.prototype, "connect").throws(new Error("`connect` should not be called"));
            const cluster = new Cluster([], { lazyConnect: true });
            cluster.disconnect();
            cluster.once("close", () => {
                cluster.once("end", () => {
                    Cluster.prototype.connect.restore();
                    done();
                });
            });
        });

        it("should support disconnecting with reconnect", (done) => {
            stub(Cluster.prototype, "connect").throws(new Error("`connect` should not be called"));
            const cluster = new Cluster([], {
                lazyConnect: true,
                clusterRetryStrategy() {
                    return 1;
                }
            });
            cluster.disconnect(true);
            cluster.once("close", () => {
                Cluster.prototype.connect.restore();
                stub(Cluster.prototype, "connect").callsFake(() => {
                    Cluster.prototype.connect.restore();
                    done();
                });
            });
        });
    });
});
