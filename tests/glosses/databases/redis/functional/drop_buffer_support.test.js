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


describe("dropBufferSupport", function () {
    it("should be disabled by default if the parser is javascript", function () {
        let redis = new Redis({ lazyConnect: true, parser: "javascript" });
        expect(redis.options).to.have.property("dropBufferSupport", false);
    });

    it("should be enabled by default if the parser is not javascript", function () {
        let redis = new Redis({ lazyConnect: true, parser: "hiredis" });
        expect(redis.options).to.have.property("dropBufferSupport", true);
    });

    it("should return strings correctly", function (done) {
        let redis = new Redis({ dropBufferSupport: false });
        redis.set("foo", new Buffer("bar"), function (err, res) {
            expect(err).to.eql(null);
            expect(res).to.eql("OK");
            redis.get("foo", function (err, res) {
                expect(err).to.eql(null);
                expect(res).to.eql("bar");
                redis.disconnect();
                done();
            });
        });
    });

    context("enabled", function () {
        it("should reject the buffer commands", function (done) {
            let redis = new Redis({ dropBufferSupport: true });
            redis.getBuffer("foo", function (err) {
                expect(err.message).to.match(/Buffer methods are not available/);

                redis.callBuffer("get", "foo", function (err) {
                    expect(err.message).to.match(/Buffer methods are not available/);
                    redis.disconnect();
                    done();
                });
            });
        });

        it("should reject the custom buffer commands", function (done) {
            let redis = new Redis({ dropBufferSupport: true });
            redis.defineCommand("geteval", {
                numberOfKeys: 0,
                lua: "return \"string\""
            });
            redis.getevalBuffer(function (err) {
                expect(err.message).to.match(/Buffer methods are not available/);
                redis.disconnect();
                done();
            });
        });

        it("should return strings correctly", function (done) {
            let redis = new Redis({ dropBufferSupport: true });
            redis.set("foo", new Buffer("bar"), function (err, res) {
                expect(err).to.eql(null);
                expect(res).to.eql("OK");
                redis.get("foo", function (err, res) {
                    expect(err).to.eql(null);
                    expect(res).to.eql("bar");
                    redis.disconnect();
                    done();
                });
            });
        });

        it("should return strings for custom commands", function (done) {
            let redis = new Redis({ dropBufferSupport: true });
            redis.defineCommand("geteval", {
                numberOfKeys: 0,
                lua: "return \"string\""
            });
            redis.geteval(function (err, res) {
                expect(err).to.eql(null);
                expect(res).to.eql("string");
                redis.disconnect();
                done();
            });
        });

        it("should work with pipeline", function (done) {
            let redis = new Redis({ dropBufferSupport: true });
            let pipeline = redis.pipeline();
            pipeline.set("foo", "bar");
            pipeline.get(new Buffer("foo"));
            pipeline.exec(function (err, res) {
                expect(err).to.eql(null);
                expect(res[0][1]).to.eql("OK");
                expect(res[1][1]).to.eql("bar");
                redis.disconnect();
                done();
            });
        });

        it("should work with transaction", function (done) {
            let redis = new Redis({ dropBufferSupport: true });
            redis.multi()
                .set("foo", "bar")
                .get("foo")
                .exec(function (err, res) {
                    expect(err).to.eql(null);
                    expect(res[0][1]).to.eql("OK");
                    expect(res[1][1]).to.eql("bar");
                    redis.disconnect();
                    done();
                });
        });

        it("should fail early with Buffer transaction", function (done) {
            let redis = new Redis({ dropBufferSupport: true });
            redis.multi()
                .set("foo", "bar")
                .getBuffer(new Buffer("foo"), function (err) {
                    expect(err.message).to.match(/Buffer methods are not available/);
                    redis.disconnect();
                    done();
                });
        });

        it("should work with internal select command", function (done) {
            let redis = new Redis({ dropBufferSupport: true, db: 1 });
            let check = new Redis({ db: 1 });
            redis.set("foo", "bar", function () {
                check.get("foo", function (err, res) {
                    expect(res).to.eql("bar");
                    redis.disconnect();
                    check.disconnect();
                    done();
                });
            });
        });
    });
});
