/* global describe it afterEach skip */

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


describe("watch-exec", function () {

    it("should support watch/exec transactions", function (done) {
        let redis1 = new Redis();
        adone.promise.nodeify(redis1.watch("watchkey")
            .then(function () {
                return redis1.multi().set("watchkey", "1").exec();
            })
            .then(function (result) {
                expect(result.length).to.eql(1);
                expect(result[0]).to.eql([null, "OK"]);
                redis1.disconnect();
            }), done);
    });

    it("should support watch/exec transaction rollback", function (done) {
        let redis1 = new Redis();
        let redis2 = new Redis();
        adone.promise.nodeify(redis1.watch("watchkey")
            .then(function () {
                return redis2.set("watchkey", "2");
            })
            .then(function () {
                return redis1.multi().set("watchkey", "1").exec();
            })
            .then(function (result) {
                expect(result).to.be.null;
                redis1.disconnect();
                redis2.disconnect();
            }), done);
    });

});
