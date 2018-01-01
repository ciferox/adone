describe("util", "RateLimiter", () => {
    const {
        util: { RateLimiter },
        promise
    } = adone;

    describe("interval validation", () => {
        it("should throw on invalid interval", () => {
            assert.throws(() => {
                new RateLimiter(1, "junk");
            }, /interval/);
        });

        it("should not throw on valid inteval", () => {
            assert.doesNotThrow(() => {
                new RateLimiter(1, "sec");
            });
            assert.doesNotThrow(() => {
                new RateLimiter(1, "second");
            });
            assert.doesNotThrow(() => {
                new RateLimiter(1, "min");
            });
            assert.doesNotThrow(() => {
                new RateLimiter(1, "minute");
            });
            assert.doesNotThrow(() => {
                new RateLimiter(1, "hr");
            });
            assert.doesNotThrow(() => {
                new RateLimiter(1, "hour");
            });
            assert.doesNotThrow(() => {
                new RateLimiter(1, "day");
            });
        });
    });

    describe("TokenBucket", () => {
        const { TokenBucket } = RateLimiter;

        let bucket;

        const TIMING_EPSILON = 10;

        before(() => {
            bucket = new TokenBucket(10, 1, 100);
        });

        it("is initialized empty", () => {
            assert.equal(bucket.bucketSize, 10);
            assert.equal(bucket.tokensPerInterval, 1);
            assert.equal(bucket.content, 0);
        });

        it("takes 1 seconds to remove 10 tokens", async () => {
            const start = new Date();
            const remainingTokens = await bucket.removeTokens(10);
            const duration = Number(new Date()) - start;
            const diff = Math.abs(1000 - duration);
            assert.ok(diff < TIMING_EPSILON, `${diff}`);
            assert.equal(remainingTokens, 0);
        });

        it("takes 1 second to remove another 10 tokens", async () => {
            await bucket.removeTokens(10);
            const start = new Date();
            const remainingTokens = await bucket.removeTokens(10);
            const duration = Number(new Date()) - start;
            const diff = Math.abs(1000 - duration);
            assert.ok(diff < TIMING_EPSILON, `${diff}`);
            assert.equal(remainingTokens, 0);
        });

        it("gives only 10 tokens after waiting 2 seconds", async () => {
            await bucket.removeTokens(10);
            await promise.delay(2000);
            const remainingTokens = await bucket.removeTokens(10);
            assert.equal(remainingTokens, 0);
        });

        it("takes 100ms to remove 1 token", async () => {
            const start = new Date();
            await bucket.removeTokens(1);
            const duration = Number(new Date()) - start;
            const diff = Math.abs(100 - duration);
            assert.ok(diff < TIMING_EPSILON, `${diff}`);
        });
    });
});
