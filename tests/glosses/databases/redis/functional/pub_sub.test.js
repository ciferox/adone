import check from "../helpers/check_redis";

skip(check);

describe("glosses", "databases", "redis", "pub/sub", () => {
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

    it("should invoke the callback when subscribe successfully", (done) => {
        const redis = new Redis();
        let pending = 1;
        redis.subscribe("foo", "bar", (err, count) => {
            expect(count).to.eql(2);
            pending -= 1;
        });
        redis.subscribe("foo", "zoo", (err, count) => {
            expect(count).to.eql(3);
            expect(pending).to.eql(0);
            redis.disconnect();
            done();
        });
    });

    it("should reject when issue a command in the subscriber mode", (done) => {
        const redis = new Redis();
        redis.subscribe("foo", () => {
            redis.set("foo", "bar", (err) => {
                expect(err instanceof Error);
                expect(err.toString()).to.match(/subscriber mode/);
                redis.disconnect();
                done();
            });
        });
    });

    it("should exit subscriber mode using unsubscribe", (done) => {
        const redis = new Redis();
        redis.subscribe("foo", "bar", () => {
            redis.unsubscribe("foo", "bar", (err, count) => {
                expect(count).to.eql(0);
                redis.set("foo", "bar", (err) => {
                    expect(err).to.eql(null);

                    redis.subscribe("zoo", "foo", () => {
                        redis.unsubscribe((err, count) => {
                            expect(count).to.eql(0);
                            redis.set("foo", "bar", (err) => {
                                expect(err).to.eql(null);
                                redis.disconnect();
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("should receive messages when subscribe a channel", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        const pub = new Redis({ dropBufferSupport: false });
        let pending = 2;
        redis.subscribe("foo", () => {
            pub.publish("foo", "bar");
        });
        redis.on("message", (channel, message) => {
            expect(channel).to.eql("foo");
            expect(message).to.eql("bar");
            if (!--pending) {
                redis.disconnect();
                done();
            }
        });
        redis.on("messageBuffer", (channel, message) => {
            expect(channel).to.be.instanceof(Buffer);
            expect(channel.toString()).to.eql("foo");
            expect(message).to.be.instanceof(Buffer);
            expect(message.toString()).to.eql("bar");
            if (!--pending) {
                redis.disconnect();
                pub.disconnect();
                done();
            }
        });
    });

    it("should receive messages when psubscribe a pattern", (done) => {
        const redis = new Redis({ dropBufferSupport: false });
        const pub = new Redis({ dropBufferSupport: false });
        let pending = 2;
        redis.psubscribe("f?oo", () => {
            pub.publish("fzoo", "bar");
        });
        redis.on("pmessage", (pattern, channel, message) => {
            expect(pattern).to.eql("f?oo");
            expect(channel).to.eql("fzoo");
            expect(message).to.eql("bar");
            if (!--pending) {
                redis.disconnect();
                pub.disconnect();
                done();
            }
        });
        redis.on("pmessageBuffer", (pattern, channel, message) => {
            expect(pattern).to.eql("f?oo");
            expect(channel).to.be.instanceof(Buffer);
            expect(channel.toString()).to.eql("fzoo");
            expect(message).to.be.instanceof(Buffer);
            expect(message.toString()).to.eql("bar");
            if (!--pending) {
                redis.disconnect();
                pub.disconnect();
                done();
            }
        });
    });

    it("should exit subscriber mode using punsubscribe", (done) => {
        const redis = new Redis();
        redis.psubscribe("f?oo", "b?ar", () => {
            redis.punsubscribe("f?oo", "b?ar", (err, count) => {
                expect(count).to.eql(0);
                redis.set("foo", "bar", (err) => {
                    expect(err).to.eql(null);

                    redis.psubscribe("z?oo", "f?oo", () => {
                        redis.punsubscribe((err, count) => {
                            expect(count).to.eql(0);
                            redis.set("foo", "bar", (err) => {
                                expect(err).to.eql(null);
                                redis.disconnect();
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("should be able to send quit command in the subscriber mode", (done) => {
        const redis = new Redis();
        let pending = 1;
        redis.subscribe("foo", () => {
            redis.quit(() => {
                pending -= 1;
            });
        });
        redis.on("end", () => {
            expect(pending).to.eql(0);
            redis.disconnect();
            done();
        });
    });

    it("should restore subscription after reconnecting(subscribe)", (done) => {
        const redis = new Redis();
        const pub = new Redis();
        redis.subscribe("foo", "bar", () => {
            redis.on("ready", () => {
                let pending = 2;
                redis.on("message", (channel, message) => {
                    if (!--pending) {
                        redis.disconnect();
                        pub.disconnect();
                        done();
                    }
                });
                pub.publish("foo", "hi1");
                pub.publish("bar", "hi2");
            });
            redis.disconnect({ reconnect: true });
        });
    });

    it("should restore subscription after reconnecting(psubscribe)", (done) => {
        const redis = new Redis();
        const pub = new Redis();
        redis.psubscribe("fo?o", "ba?r", () => {
            redis.on("ready", () => {
                let pending = 2;
                redis.on("pmessage", (pattern, channel, message) => {
                    if (!--pending) {
                        redis.disconnect();
                        pub.disconnect();
                        done();
                    }
                });
                pub.publish("fo1o", "hi1");
                pub.publish("ba1r", "hi2");
            });
            redis.disconnect({ reconnect: true });
        });
    });
});
