import check from "../helpers/check_redis";

describe("database", "redis", "watch-exec", { skip: check }, () => {
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

    it("should support watch/exec transactions", (done) => {
        const redis1 = new Redis();
        adone.promise.nodeify(redis1.watch("watchkey")
            .then(() => {
                return redis1.multi().set("watchkey", "1").exec();
            })
            .then((result) => {
                expect(result.length).to.eql(1);
                expect(result[0]).to.eql([null, "OK"]);
                redis1.disconnect();
            }), done);
    });

    it("should support watch/exec transaction rollback", (done) => {
        const redis1 = new Redis();
        const redis2 = new Redis();
        adone.promise.nodeify(redis1.watch("watchkey")
            .then(() => {
                return redis2.set("watchkey", "2");
            })
            .then(() => {
                return redis1.multi().set("watchkey", "1").exec();
            })
            .then((result) => {
                expect(result).to.be.null;
                redis1.disconnect();
                redis2.disconnect();
            }), done);
    });

});
