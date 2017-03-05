/* global describe it afterEach skip context */

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
let MAX_NUMBER = 9007199254740991; // Number.MAX_SAFE_INTEGER

describe("stringNumbers", function () {
    context("enabled", function () {
        it("returns numbers as strings", function (done) {
            let redis = new Redis({
                stringNumbers: true
            });

            let pending = 0;

            redis.set("foo", MAX_NUMBER);
            redis.incr("foo", check("9007199254740992"));
            redis.incr("foo", check("9007199254740993"));
            redis.incr("foo", check("9007199254740994"));

            // also works for small interger
            redis.set("foo", 123);
            redis.incr("foo", check("124"));

            // and floats
            redis.set("foo", 123.23);
            redis.incrbyfloat("foo", 1.2, check("124.43"));

            function check(expected) {
                pending += 1;
                return function (err, res) {
                    expect(res).to.eql(expected);
                    if (!--pending) {
                        redis.disconnect();
                        done();
                    }
                };
            }
        });
    });

    context("disabled", function () {
        it("returns numbers", function (done) {
            let redis = new Redis();

            redis.set("foo", "123");
            redis.incr("foo", function (err, res) {
                expect(res).to.eql(124);
                redis.disconnect();
                done();
            });
        });
    });
});
