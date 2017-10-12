const {
    util: { retry }
} = adone;

describe("util", "retry", () => {
    it("forever", () => {
        const operation = retry.operation({
            retries: 0,
            minTimeout: 100,
            maxTimeout: 100,
            forever: true
        });

        operation.attempt((numAttempt) => {
            const err = new Error("foo");
            if (numAttempt === 10) {
                operation.stop();
            }

            if (operation.retry(err)) {
                //
            }
        });
    });

    describe("timeouts", () => {
        it("default values", () => {
            const timeouts = retry.timeouts();

            assert.equal(timeouts.length, 10);
            assert.equal(timeouts[0], 1000);
            assert.equal(timeouts[1], 2000);
            assert.equal(timeouts[2], 4000);
        });

        it("default values with randomize", () => {
            const minTimeout = 5000;
            const timeouts = retry.timeouts({
                minTimeout,
                randomize: true
            });

            assert.equal(timeouts.length, 10);
            assert.ok(timeouts[0] > minTimeout);
            assert.ok(timeouts[1] > timeouts[0]);
            assert.ok(timeouts[2] > timeouts[1]);
        });

        it("passed timeouts are used", () => {
            const timeoutsArray = [1000, 2000, 3000];
            const timeouts = retry.timeouts(timeoutsArray);
            assert.deepEqual(timeouts, timeoutsArray);
            assert.notStrictEqual(timeouts, timeoutsArray);
        });

        it("timeouts are within boundaries", () => {
            const minTimeout = 1000;
            const maxTimeout = 10000;
            const timeouts = retry.timeouts({
                minTimeout,
                maxTimeout
            });
            for (let i = 0; i < timeouts; i++) {
                assert.ok(timeouts[i] >= minTimeout);
                assert.ok(timeouts[i] <= maxTimeout);
            }
        });

        it("timeouts are incremental", () => {
            const timeouts = retry.timeouts();
            let lastTimeout = timeouts[0];
            for (let i = 0; i < timeouts; i++) {
                assert.ok(timeouts[i] > lastTimeout);
                lastTimeout = timeouts[i];
            }
        });

        it("timeouts are incremental for factors less than one", () => {
            const timeouts = retry.timeouts({
                retries: 3,
                factor: 0.5
            });

            const expected = [250, 500, 1000];
            assert.deepEqual(expected, timeouts);
        });

        it("retries", () => {
            const timeouts = retry.timeouts({ retries: 2 });
            assert.strictEqual(timeouts.length, 2);
        });
    });

    describe("operation", () => {
        it("errors", () => {
            const operation = retry.operation();

            const error = new Error("some error");
            const error2 = new Error("some other error");
            operation._errors.push(error);
            operation._errors.push(error2);

            assert.deepEqual(operation.errors(), [error, error2]);
        });

        it("mainError() should return most frequent error", () => {
            const operation = retry.operation();
            const error = new Error("some error");
            const error2 = new Error("some other error");

            operation._errors.push(error);
            operation._errors.push(error2);
            operation._errors.push(error);

            assert.strictEqual(operation.mainError(), error);
        });

        it("mainError() should return last error on equal count", () => {
            const operation = retry.operation();
            const error = new Error("some error");
            const error2 = new Error("some other error");

            operation._errors.push(error);
            operation._errors.push(error2);

            assert.strictEqual(operation.mainError(), error2);
        });

        it("attempt", () => {
            const operation = retry.operation();
            const fn = new Function();

            const timeoutOpts = {
                timeout: 1,
                cb() { }
            };
            operation.attempt(fn, timeoutOpts);

            assert.strictEqual(fn, operation._fn);
            assert.strictEqual(timeoutOpts.timeout, operation._operationTimeout);
            assert.strictEqual(timeoutOpts.cb, operation._operationTimeoutCb);
        });

        it("retry", (done) => {
            const error = new Error("some error");
            const operation = retry.operation([1, 2, 3]);
            let attempts = 0;

            const fn = function () {
                operation.attempt((currentAttempt) => {
                    attempts++;
                    assert.equal(currentAttempt, attempts);
                    if (operation.retry(error)) {
                        return;
                    }

                    assert.strictEqual(attempts, 4);
                    assert.strictEqual(operation.attempts(), attempts);
                    assert.strictEqual(operation.mainError(), error);
                    done();
                });
            };

            fn();
        });

        it("retry forever", (done) => {
            const error = new Error("some error");
            const operation = retry.operation({ retries: 3, forever: true });
            let attempts = 0;

            const fn = function () {
                operation.attempt((currentAttempt) => {
                    attempts++;
                    assert.equal(currentAttempt, attempts);
                    if (attempts !== 6 && operation.retry(error)) {
                        return;
                    }

                    assert.strictEqual(attempts, 6);
                    assert.strictEqual(operation.attempts(), attempts);
                    assert.strictEqual(operation.mainError(), error);
                    done();
                });
            };

            fn();
        });

        it("retry forever with no retries", (done) => {
            const error = new Error("some error");
            const delay = 50;
            const operation = retry.operation({
                retries: null,
                forever: true,
                minTimeout: delay,
                maxTimeout: delay
            });

            let attempts = 0;
            const startTime = new Date().getTime();

            const fn = function () {
                operation.attempt((currentAttempt) => {
                    attempts++;
                    assert.equal(currentAttempt, attempts);
                    if (attempts !== 4 && operation.retry(error)) {
                        return;
                    }

                    const endTime = new Date().getTime();
                    const minTime = startTime + (delay * 3);
                    const maxTime = minTime + 20; // add a little headroom for code execution time
                    assert(endTime > minTime);
                    assert(endTime < maxTime);
                    assert.strictEqual(attempts, 4);
                    assert.strictEqual(operation.attempts(), attempts);
                    assert.strictEqual(operation.mainError(), error);
                    done();
                });
            };

            fn();
        });

        it("stop", (done) => {
            const error = new Error("some error");
            const operation = retry.operation([1, 2, 3]);
            let attempts = 0;

            const fn = function () {
                operation.attempt((currentAttempt) => {
                    attempts++;
                    assert.equal(currentAttempt, attempts);

                    if (attempts === 2) {
                        operation.stop();

                        assert.strictEqual(attempts, 2);
                        assert.strictEqual(operation.attempts(), attempts);
                        assert.strictEqual(operation.mainError(), error);
                        done();
                    }

                    if (operation.retry(error)) {
                        //
                    }
                });
            };

            fn();
        });
    });
});
