import check from "../helpers/check_redis";

describe("database", "redis", "monitor", { skip: check }, () => {
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

    it("should receive commands", (done) => {
        const redis = new Redis();
        redis.monitor((err, monitor) => {
            monitor.on("monitor", (time, args) => {
                expect(args[0]).to.eql("get");
                expect(args[1]).to.eql("foo");
                redis.disconnect();
                monitor.disconnect();
                done();
            });
            redis.get("foo");
        });
    });

    it("should reject processing commands", (done) => {
        const redis = new Redis();
        redis.monitor((err, monitor) => {
            monitor.get("foo", (err) => {
                expect(err.message).to.match(/Connection is in monitoring mode/);
                redis.disconnect();
                monitor.disconnect();
                done();
            });
        });
    });

    it("should continue monitoring after reconnection", (done) => {
        const redis = new Redis();
        redis.monitor((err, monitor) => {
            monitor.on("monitor", (time, args) => {
                if (args[0] === "set") {
                    redis.disconnect();
                    monitor.disconnect();
                    done();
                }
            });
            monitor.disconnect(true);
            monitor.on("ready", () => {
                redis.set("foo", "bar");
            });
        });
    });

    it("should wait for the ready event before monitoring", (done) => {
        const redis = new Redis();
        redis.on("ready", () => {
            let ready;
            stub(Redis.prototype, "_readyCheck").callsFake(function check(...args) {
                ready = true;
                Redis.prototype._readyCheck.restore();
                Redis.prototype._readyCheck.apply(this, args);
            });
            redis.monitor((err, monitor) => {
                expect(ready).to.eql(true);
                redis.disconnect();
                monitor.disconnect();
                done();
            });
        });
    });
});
