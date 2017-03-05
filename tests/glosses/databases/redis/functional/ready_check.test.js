/* global skip afterEach it describe */

import { stub } from "sinon";
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

describe("ready_check", function () {
    it("should retry when redis is not ready", function (done) {
        let redis = new Redis({ lazyConnect: true });

        stub(redis, "info", function (callback) {
            callback(null, "loading:1\r\nloading_eta_seconds:7");
        });
        stub(global, "setTimeout", function (body, ms) {
            if (ms === 7000) {
                redis.info.restore();
                global.setTimeout.restore();
                redis.disconnect();
                done();
            }
        });
        redis.connect();
    });

    it("should reconnect when info return a error", function (done) {
        let redis = new Redis({
            lazyConnect: true,
            retryStrategy: function () {
                redis.disconnect();
                done();
                return;
            }
        });

        stub(redis, "info", function (callback) {
            callback(new Error("info error"));
        });

        redis.connect();
    });
});
