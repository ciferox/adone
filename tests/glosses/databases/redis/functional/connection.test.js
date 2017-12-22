import check from "../helpers/check_redis";
import MockServer from "../helpers/mock_server";

describe("database", "redis", "connection", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should emit \"connect\" when connected", (done) => {
        const redis = new Redis();
        redis.on("connect", () => {
            redis.disconnect();
            done();
        });
    });

    it("should emit \"close\" when disconnected", (done) => {
        const redis = new Redis();
        redis.once("end", done);
        redis.once("connect", () => {
            redis.disconnect();
        });
    });

    it("should send AUTH command before any other commands", (done) => {
        const redis = new Redis({ password: "123" });
        redis.get("foo");
        let times = 0;
        stub(redis, "sendCommand").callsFake((command) => {
            times += 1;
            if (times === 1) {
                expect(command.name).to.eql("auth");
                redis.disconnect();
            } else if (times === 2) {
                expect(command.name).to.eql("info");
                done();
            }
            return command.promise;
        });
    });

    it("should receive replies after connection is disconnected", async () => {
        const redis = new Redis();
        redis.set("foo", "bar").then(() => {
            redis.stream.end();
        });
        expect(await redis.get("foo")).to.be.equal("bar");
        redis.disconnect();
    });

    it("should close the connection when timeout", async () => {
        const redis = new Redis(6379, "192.0.0.0", {
            connectTimeout: 1,
            retryStrategy: null
        });
        const onError = spy();
        redis.on("error", onError);
        await Promise.all([
            assert.throws(async () => {
                await redis.get("foo");
            }, "Connection is closed"),
            onError.waitForCall()
        ]);
        expect(onError).to.have.been.calledWith(match((err) => err.message === "connect ETIMEDOUT"));
    });

    it("should clear the timeout when connected", (done) => {
        const redis = new Redis({ connectTimeout: 10000 });
        setImmediate(() => {
            stub(redis.stream, "setTimeout").callsFake((timeout) => {
                expect(timeout).to.be.equal(0);
                redis.stream.setTimeout.restore();
                redis.disconnect();
                done();
            });
        });
    });

    describe("connect", () => {
        it("should return a promise", async () => {
            const redis = new Redis({ lazyConnect: true });
            await redis.connect();
            redis.disconnect();
            const redis2 = new Redis(6390, { lazyConnect: true, retryStrategy: null });
            const p2 = redis2.connect();
            expect(p2).to.be.a("promise");
            await assert.throws(async () => {
                await p2;
            });
            redis2.disconnect();
        });

        it("should stop reconnecting when disconnected", (done) => {
            const redis = new Redis(8999, {
                retryStrategy() {
                    return 0;
                }
            });

            redis.on("close", () => {
                redis.disconnect();
                stub(Redis.prototype, "connect").throws(new Error("`connect` should not be called"));
                setTimeout(() => {
                    Redis.prototype.connect.restore();
                    done();
                }, 1);
            });
        });

        it("should reject when connected", async () => {
            const redis = new Redis();
            await assert.throws(async () => {
                await redis.connect();
            }, "Redis is already connecting");
        });
    });

    describe("retryStrategy", () => {
        it("should pass the correct retry times", (done) => {
            let t = 0;
            new Redis({
                port: 1,
                retryStrategy(times) {
                    expect(times).to.be.equal(++t);
                    if (times === 3) {
                        done();
                        return;
                    }
                    return 0;
                }
            });
        });

        it("should skip reconnecting when retryStrategy doesn't return a number", (done) => {
            const redis = new Redis({
                port: 1,
                retryStrategy() {
                    process.nextTick(() => {
                        expect(redis.status).to.be.equal("end");
                        done();
                    });
                    return null;
                }
            });
        });
    });

    describe("connectionName", () => {
        it("should name the connection if options.connectionName is not null", async () => {
            const redis = new Redis({ connectionName: "niceName" });
            await waitFor(redis, "ready");
            expect(await redis.client("getname")).to.be.equal("niceName");
            await redis.set("foo", 1);
            redis.disconnect();
        });

        it("should set the name before any subscribe command if reconnected", async () => {
            const redis = new Redis({ connectionName: "niceName" });
            await waitFor(redis, "ready");
            await redis.subscribe("l");
            redis.disconnect(true);
            await redis.unsubscribe("l");
            expect(await redis.client("getname")).to.be.equal("niceName");
            redis.disconnect();
        });
    });

    describe("readOnly", () => {
        it("should send readonly command before other commands", async () => {
            let called = false;
            const redis = new Redis({ port: 30001, readOnly: true, showFriendlyErrorStack: true });
            const getFoo = spy();
            const node = new MockServer(30001, (argv) => {
                if (argv[0] === "readonly") {
                    called = true;
                } else if (argv[0] === "get" && argv[1] === "foo") {
                    getFoo();
                }
            });
            redis.get("foo").catch(adone.noop);
            await getFoo.waitForCall();
            expect(called).to.be.true();
            redis.disconnect();
            await node.disconnect();
        });
    });

    describe("autoResendUnfulfilledCommands", () => {
        it("should resend unfulfilled commands to the correct db when reconnected", async () => {
            const redis = new Redis({ db: 3 });
            const pub = new Redis({ db: 3 });
            redis.once("close", () => {
                pub.lpush("l", 1);
            });
            await waitFor(redis, "ready");

            const [blpopres, , piperes] = await Promise.all([
                redis.blpop("l", 0),
                redis.set("foo", "1"),
                redis.pipeline().incr("foo").exec(),
                Promise.resolve().then(() => redis.stream.end())
            ]);
            expect(blpopres).to.be.deep.equal(["l", "1"]);
            expect(piperes).to.be.deep.equal([[null, 2]]);
            redis.disconnect();
            pub.disconnect();
        });

        it("should resend previous subscribes before sending unfulfilled commands", async () => {
            const redis = new Redis({ db: 4 });
            const pub = new Redis({ db: 4 });
            await waitFor(redis, "ready");
            const channelsBefore = await pub.pubsub("channels");
            await redis.subscribe("l");
            redis.disconnect(true);
            await redis.unsubscribe("l");
            const channels = await pub.pubsub("channels");
            expect(channels).to.have.lengthOf(channelsBefore.length);
            redis.disconnect();
            pub.disconnect();
        });
    });
});
