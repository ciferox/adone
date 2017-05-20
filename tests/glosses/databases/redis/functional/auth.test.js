import MockServer from "../helpers/mock_server";
import check from "../helpers/check_redis";

skip(check);

describe("glosses", "databases", "redis", "auth", () => {
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

    it("should send auth before other commands", (done) => {
        let authed = false;
        const redis = new Redis({ port: 17379, password: "pass" });
        redis.get("foo").catch(adone.noop);
        const server = new MockServer(17379, (argv) => {
            if (argv[0] === "auth" && argv[1] === "pass") {
                authed = true;
            } else if (argv[0] === "get" && argv[1] === "foo") {
                expect(authed).to.eql(true);
                redis.disconnect();
                server.disconnect();
                done();
            }
        });
    });

    it("should resend auth after reconnect", (done) => {
        let begin = false;
        let authed = false;
        const redis = new Redis({ port: 17379, password: "pass" });
        redis.once("ready", () => {
            begin = true;
            redis.disconnect({ reconnect: true });
            redis.get("foo").catch(adone.noop);
        });
        const server = new MockServer(17379, (argv) => {
            if (!begin) {
                return;
            }
            if (argv[0] === "auth" && argv[1] === "pass") {
                authed = true;
            } else if (argv[0] === "get" && argv[1] === "foo") {
                expect(authed).to.eql(true);
                redis.disconnect();
                server.disconnect();
                done();
            }
        });
    });

    it("should not emit \"error\" when the server doesn't need auth", (done) => {
        const server = new MockServer(17379, (argv) => {
            if (argv[0] === "auth" && argv[1] === "pass") {
                return new Error("ERR Client sent AUTH, but no password is set");
            }
        });
        let errorEmited = false;
        const redis = new Redis({ port: 17379, password: "pass" });
        redis.on("error", () => {
            errorEmited = true;
        });
        stub(adone, "warn").callsFake((warn) => {
            if (warn.indexOf("but a password was supplied") !== -1) {
                adone.warn.restore();
                setTimeout(() => {
                    expect(errorEmited).to.eql(false);
                    redis.disconnect();
                    server.disconnect();
                    done();
                }, 0);
            }
        });
    });

    it("should emit \"error\" when the password is wrong", (done) => {
        const server = new MockServer(17379, (argv) => {
            if (argv[0] === "auth" && argv[1] === "pass") {
                return new Error("ERR invalid password");
            }
        });
        const redis = new Redis({ port: 17379, password: "pass" });
        let pending = 2;
        const check = () => {
            if (!--pending) {
                redis.disconnect();
                server.disconnect();
                done();
            }
        };
        redis.on("error", (error) => {
            expect(error).to.have.property("message", "ERR invalid password");
            check();
        });
        redis.get("foo", (err) => {
            expect(err.message).to.eql("ERR invalid password");
            check();
        });
    });

    it("should emit \"error\" when password is not provided", (done) => {
        const server = new MockServer(17379, (argv) => {
            if (argv[0] === "info") {
                return new Error("NOAUTH Authentication required.");
            }
        });
        const redis = new Redis({ port: 17379 });
        redis.on("error", (error) => {
            expect(error).to.have.property("message", "NOAUTH Authentication required.");
            redis.disconnect();
            server.disconnect();
            done();
        });
    });
});
