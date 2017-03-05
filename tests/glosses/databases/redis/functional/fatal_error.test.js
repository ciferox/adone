/* global skip afterEach describe it */

import check from "../helpers/check_redis";

const Redis = adone.database.Redis;

skip(check);


afterEach(function (done) {
    let redis = new Redis();
    redis.flushall(function () {
        redis.script("flush", function () {
            redis.disconnect();
            done();
        });
    });
});


describe("fatal_error", function () {
    it("should handle fatal error of parser", function (done) {
        let redis = new Redis();
        redis.once("ready", function () {
            let execute = redis.replyParser.execute;
            redis.replyParser.execute = function () {
                execute.call(redis.replyParser, "&");
            };
            redis.get("foo", function (err) {
                expect(err.message).to.match(/Protocol error/);
                redis.replyParser.execute = execute;
                redis.get("bar", function (err) {
                    expect(err).to.eql(null);
                    redis.disconnect();
                    done();
                });
            });
        });
    });
});
