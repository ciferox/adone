import check from "../helpers/check_redis";

skip(check);

describe("glosses", "databases", "redis", "stringNumbers", () => {
    const { database: { redis: { Redis } } } = adone;
    const MAX_NUMBER = 9007199254740991; // Number.MAX_SAFE_INTEGER

    afterEach((done) => {
        const redis = new Redis();
        redis.flushall(() => {
            redis.script("flush", () => {
                redis.disconnect();
                done();
            });
        });
    });

    context("enabled", () => {
        it("returns numbers as strings", (done) => {
            const redis = new Redis({
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

    context("disabled", () => {
        it("returns numbers", (done) => {
            const redis = new Redis();

            redis.set("foo", "123");
            redis.incr("foo", (err, res) => {
                expect(res).to.eql(124);
                redis.disconnect();
                done();
            });
        });
    });
});
