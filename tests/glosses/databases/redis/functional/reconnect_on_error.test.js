import check from "../helpers/check_redis";

skip(check);

describe("glosses", "databases", "redis", "reconnectOnError", () => {
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

    it("should pass the error as the first param", (done) => {
        let pending = 2;
        function assert(err) {
            expect(err.name).to.eql("ReplyError");
            expect(err.command.name).to.eql("set");
            expect(err.command.args).to.eql(["foo"]);
            if (!--pending) {
                redis.disconnect();
                done();
            }
        }
        const redis = new Redis({
            reconnectOnError(err) {
                assert(err);
            }
        });

        redis.set("foo", (err) => {
            assert(err);
        });
    });

    it("should not reconnect if reconnectOnError returns false", (done) => {
        const redis = new Redis({
            reconnectOnError(err) {
                return false;
            }
        });

        redis.disconnect = function () {
            throw new Error("should not disconnect");
        };

        redis.set("foo", (err) => {
            redis.__proto__.disconnect.call(redis);
            done();
        });
    });

    it("should reconnect if reconnectOnError returns true or 1", (done) => {
        const redis = new Redis({
            reconnectOnError() {
                return true;
            }
        });

        redis.set("foo", () => {
            redis.on("ready", () => {
                redis.disconnect();
                done();
            });
        });
    });

    it("should reconnect and retry the command if reconnectOnError returns 2", (done) => {
        const redis = new Redis({
            reconnectOnError() {
                redis.del("foo");
                return 2;
            }
        });

        redis.set("foo", "bar");
        redis.sadd("foo", "a", (err, res) => {
            expect(res).to.eql(1);
            redis.disconnect();
            done();
        });
    });

    it("should select the currect database", (done) => {
        const redis = new Redis({
            reconnectOnError() {
                redis.select(3);
                redis.del("foo");
                redis.select(0);
                return 2;
            }
        });

        redis.select(3);
        redis.set("foo", "bar");
        redis.sadd("foo", "a", (err, res) => {
            expect(res).to.eql(1);
            redis.select(3);
            redis.type("foo", (err, type) => {
                expect(type).to.eql("set");
                redis.disconnect();
                done();
            });
        });
    });

    it("should work with pipeline", (done) => {
        const redis = new Redis({
            reconnectOnError() {
                redis.del("foo");
                return 2;
            }
        });

        redis.set("foo", "bar");
        redis.pipeline().get("foo").sadd("foo", "a").exec((err, res) => {
            expect(res).to.eql([[null, "bar"], [null, 1]]);
            redis.disconnect();
            done();
        });
    });
});
