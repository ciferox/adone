import check from "../helpers/check_redis";

skip(check);

describe("glosses", "databases", "redis", "select", () => {
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

    it("should support auto select", (done) => {
        const redis = new Redis({ db: 2 });
        redis.set("foo", "2");
        redis.select("2");
        redis.get("foo", (err, res) => {
            expect(res).to.eql("2");
            redis.disconnect();
            done();
        });
    });

    it("should resend commands to the correct db", (done) => {
        const redis = new Redis();
        redis.once("ready", () => {
            redis.set("foo", "2", () => {
                redis.stream.destroy();
                redis.select("3");
                redis.set("foo", "3");
                redis.select("0");
                redis.get("foo", (err, res) => {
                    expect(res).to.eql("2");
                    redis.select("3");
                    redis.get("foo", (err, res) => {
                        expect(res).to.eql("3");
                        redis.disconnect();
                        done();
                    });
                });
            });
        });
    });

    it("should re-select the current db when reconnect", (done) => {
        const redis = new Redis();

        redis.once("ready", () => {
            redis.set("foo", "bar");
            redis.select(2);
            redis.set("foo", "2", () => {
                redis.stream.destroy();
                redis.get("foo", (err, res) => {
                    expect(res).to.eql("2");
                    redis.disconnect();
                    done();
                });
            });
        });
    });

    it("should emit \"select\" event when db changes", (done) => {
        const changes = [];
        const redis = new Redis();
        redis.on("select", (db) => {
            changes.push(db);
        });
        redis.select("2", () => {
            expect(changes).to.eql([2]);
            redis.select("4", () => {
                expect(changes).to.eql([2, 4]);
                redis.select("4", () => {
                    expect(changes).to.eql([2, 4]);
                    redis.disconnect();
                    done();
                });
            });
        });
    });

    it("should be sent on the connect event", (done) => {
        const redis = new Redis({ db: 2 });
        const select = redis.select;
        redis.select = function () {
            return select.apply(redis, arguments).then(() => {
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
