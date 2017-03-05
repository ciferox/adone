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

describe("transaction", function () {
    it("should works like pipeline by default", function (done) {
        let redis = new Redis();
        redis.multi().set("foo", "transaction").get("foo").exec(function (err, result) {
            expect(err).to.eql(null);
            expect(result).to.eql([[null, "OK"], [null, "transaction"]]);
            redis.disconnect();
            done();
        });
    });

    it("should handle runtime errors correctly", function (done) {
        let redis = new Redis();
        redis.multi().set("foo", "bar").lpush("foo", "abc").exec(function (err, result) {
            expect(err).to.eql(null);
            expect(result.length).to.eql(2);
            expect(result[0]).to.eql([null, "OK"]);
            expect(result[1][0]).to.be.instanceof(Error);
            expect(result[1][0].toString()).to.match(/wrong kind of value/);
            redis.disconnect();
            done();
        });
    });

    it("should handle compile-time errors correctly", function (done) {
        let redis = new Redis();
        redis.multi().set("foo").get("foo").exec(function (err) {
            expect(err).to.be.instanceof(Error);
            expect(err.toString()).to.match(/Transaction discarded because of previous errors/);
            redis.disconnect();
            done();
        });
    });

    it("should also support command callbacks", function (done) {
        let redis = new Redis();
        let pending = 1;
        redis.multi().set("foo", "bar").get("foo", function (err, value) {
            pending -= 1;
            expect(value).to.eql("QUEUED");
        }).exec(function (err, result) {
            expect(pending).to.eql(0);
            expect(result).to.eql([[null, "OK"], [null, "bar"]]);
            redis.disconnect();
            done();
        });
    });

    it("should also handle errors in command callbacks", function (done) {
        let redis = new Redis();
        let pending = 1;
        redis.multi().set("foo", function (err) {
            expect(err.toString()).to.match(/wrong number of arguments/);
            pending -= 1;
        }).exec(function (err) {
            expect(err.toString()).to.match(/Transaction discarded because of previous errors/);
            if (!pending) {
                redis.disconnect();
                done();
            }
        });
    });

    it("should work without pipeline", function (done) {
        let redis = new Redis();
        redis.multi({ pipeline: false });
        redis.set("foo", "bar");
        redis.get("foo");
        redis.exec(function (err, results) {
            expect(results).to.eql([[null, "OK"], [null, "bar"]]);
            redis.disconnect();
            done();
        });
    });

    describe("transformer", function () {
        it("should trigger transformer", function (done) {
            let redis = new Redis({ dropBufferSupport: false });
            let pending = 2;
            let data = { name: "Bob", age: "17" };
            redis.multi().hmset("foo", data).hgetall("foo", function (err, res) {
                expect(res).to.eql("QUEUED");
                if (!--pending) {
                    redis.disconnect();
                    done();
                }
            }).hgetallBuffer("foo").get("foo").getBuffer("foo").exec(function (err, res) {
                expect(res[0][1]).to.eql("OK");
                expect(res[1][1]).to.eql(data);
                expect(res[2][1]).to.eql({
                    name: new Buffer("Bob"),
                    age: new Buffer("17")
                });
                expect(res[3][0]).to.have.property("message",
                    "WRONGTYPE Operation against a key holding the wrong kind of value");
                expect(res[4][0]).to.have.property("message",
                    "WRONGTYPE Operation against a key holding the wrong kind of value");

                if (!--pending) {
                    redis.disconnect();
                    done();
                }
            });
        });

        it("should trigger transformer inside pipeline", function (done) {
            let redis = new Redis({ dropBufferSupport: false });
            let data = { name: "Bob", age: "17" };
            redis.pipeline().hmset("foo", data).multi().typeBuffer("foo")
                .hgetall("foo").exec().hgetall("foo").exec(function (err, res) {
                    expect(res[0][1]).to.eql("OK");
                    expect(res[1][1]).to.eql("OK");
                    expect(res[2][1]).to.eql(new Buffer("QUEUED"));
                    expect(res[3][1]).to.eql("QUEUED");
                    expect(res[4][1]).to.eql([new Buffer("hash"), data]);
                    expect(res[5][1]).to.eql(data);
                    redis.disconnect();
                    done();
                });
        });

        it("should handle custom transformer exception", function (done) {
            let transformError = "transformer error";
            Redis.Command._transformer.reply.get = function () {
                throw new Error(transformError);
            };

            let redis = new Redis();
            redis.multi().get("foo").exec(function (err, res) {
                expect(res[0][0]).to.have.property("message", transformError);
                delete Redis.Command._transformer.reply.get;
                redis.disconnect();
                done();
            });
        });
    });

    describe("#addBatch", function () {
        it("should accept commands in constructor", function (done) {
            let redis = new Redis();
            let pending = 1;
            redis.multi([
                ["set", "foo", "bar"],
                ["get", "foo", function (err, result) {
                    expect(result).to.eql("QUEUED");
                    pending -= 1;
                }]
            ]).exec(function (err, results) {
                expect(pending).to.eql(0);
                expect(results[1][1]).to.eql("bar");
                redis.disconnect();
                done();
            });
        });
    });

    describe("#exec", function () {
        it("should batch all commands before ready event", function (done) {
            let redis = new Redis();
            redis.on("connect", function () {
                redis.multi().info().config("get", "maxmemory").exec(function (err, res) {
                    expect(err).to.eql(null);
                    expect(res).to.have.lengthOf(2);
                    expect(res[0][0]).to.eql(null);
                    expect(typeof res[0][1]).to.eql("string");
                    expect(res[1][0]).to.eql(null);
                    expect(Array.isArray(res[1][1])).to.eql(true);
                    redis.disconnect();
                    done();
                });
            });
        });
    });
});
