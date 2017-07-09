import check from "../helpers/check_redis";

describe("database", "redis", "pub/sub", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    it("should subscribe successfully", async () => {
        const redis = new Redis();
        expect(await redis.subscribe("foo", "bar")).to.be.equal(2);
        expect(await redis.subscribe("foo", "zoo")).to.be.equal(3);
        redis.disconnect();
    });

    it("should reject when issue a command in the subscriber mode", async () => {
        const redis = new Redis();
        await redis.subscribe("foo");
        await assert.throws(async () => {
            await redis.set("foo", "bar");
        }, "subscriber mode");
        redis.disconnect();
    });

    it("should exit subscriber mode using unsubscribe", async () => {
        const redis = new Redis();
        await redis.subscribe("foo", "bar");
        expect(await redis.unsubscribe("foo", "bar")).to.be.equal(0);
        await redis.set("foo", "bar");
        await redis.subscribe("zoo", "foo");
        expect(await redis.unsubscribe()).to.be.equal(0);
        await redis.set("foo", "bar");
        redis.disconnect();
    });

    it("should receive messages when subscribe a channel", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        const pub = new Redis({ dropBufferSupport: false });
        redis.subscribe("foo").then(() => pub.publish("foo", "bar"));
        const onMessage = spy();
        redis.on("message", onMessage);
        const onMessageBuffer = spy();
        redis.on("messageBuffer", onMessageBuffer);
        await Promise.all([
            onMessage.waitForArgs("foo", "bar"),
            onMessageBuffer.waitForArgs(Buffer.from("foo"), Buffer.from("bar"))
        ]);
        redis.disconnect();
        pub.disconnect();
    });

    it("should receive messages when psubscribe a pattern", async () => {
        const redis = new Redis({ dropBufferSupport: false });
        const pub = new Redis({ dropBufferSupport: false });
        redis.psubscribe("f?oo").then(() => pub.publish("fzoo", "bar"));
        const onPMessage = spy();
        redis.on("pmessage", onPMessage);
        const onPMessageBuffer = spy();
        redis.on("pmessageBuffer", onPMessageBuffer);
        await Promise.all([
            onPMessage.waitForArgs("f?oo", "fzoo", "bar"),
            onPMessageBuffer.waitForArgs("f?oo", Buffer.from("fzoo"), Buffer.from("bar"))
        ]);
        redis.disconnect();
        pub.disconnect();
    });

    it("should exit subscriber mode using punsubscribe", async () => {
        const redis = new Redis();
        await redis.psubscribe("f?oo", "b?ar");
        expect(await redis.punsubscribe("f?oo", "b?ar")).to.be.equal(0);
        await redis.set("foo", "bar");
        await redis.psubscribe("z?oo", "f?oo");
        expect(await redis.punsubscribe()).to.be.equal(0);
        await redis.set("foo", "bar");
        redis.disconnect();
    });

    it("should be able to send quit command in the subscriber mode", (done) => {
        const redis = new Redis();
        let pending = 1;
        redis.subscribe("foo").then(() => redis.quit()).then(() => {
            pending -= 1;
        });
        redis.on("end", () => {
            expect(pending).to.be.equal(0);
            redis.disconnect();
            done();
        });
    });

    it("should restore subscription after reconnecting(subscribe)", async () => {
        const redis = new Redis();
        const pub = new Redis();
        await redis.subscribe("foo", "bar");
        redis.disconnect({ reconnect: true });
        await waitFor(redis, "ready");
        const onMessage = spy();
        redis.on("message", onMessage);
        pub.publish("foo", "hi1");
        pub.publish("bar", "hi2");
        await Promise.all([
            onMessage.waitForArgs("foo", "hi1"),
            onMessage.waitForArgs("bar", "hi2")
        ]);
        redis.disconnect();
        pub.disconnect();
    });

    it("should restore subscription after reconnecting(psubscribe)", async () => {
        const redis = new Redis();
        const pub = new Redis();
        await redis.psubscribe("fo?o", "ba?r");
        redis.disconnect({ reconnect: true });
        await waitFor(redis, "ready");
        const onPMessage = spy();
        redis.on("pmessage", onPMessage);
        pub.publish("fo1o", "hi1");
        pub.publish("ba1r", "hi2");
        await Promise.all([
            onPMessage.waitForArgs("fo?o", "fo1o", "hi1"),
            onPMessage.waitForArgs("ba?r", "ba1r", "hi2")
        ]);
        redis.disconnect();
        pub.disconnect();
    });
});
