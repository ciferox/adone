import check from "../helpers/check_redis";

skip(check);

describe("glosses", "databases", "redis", "fatal_error", () => {
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

    it("should handle fatal error of parser", (done) => {
        const redis = new Redis();
        redis.once("ready", () => {
            const execute = redis.replyParser.execute;
            redis.replyParser.execute = function () {
                execute.call(redis.replyParser, "&");
            };
            redis.get("foo", (err) => {
                expect(err.message).to.match(/Protocol error/);
                redis.replyParser.execute = execute;
                redis.get("bar", (err) => {
                    expect(err).to.eql(null);
                    redis.disconnect();
                    done();
                });
            });
        });
    });
});
