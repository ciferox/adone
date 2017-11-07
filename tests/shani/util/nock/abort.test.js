describe("shani", "util", "nock", "abort", () => {
    const {
        shani: {
            util: { nock }
        },
        std: { http }
    } = adone;

    const assertEvents = (cb) => {
        let gotAbort = false;
        const req = http.get("http://localhost:16829/status")
            .once("abort", () => {
                // Should trigger first
                gotAbort = true;
            })
            .once("error", (err) => {
                // Should trigger last
                assert.equal(err.code, "ECONNRESET");
                assert.ok(gotAbort, "didn't get abort event");
                cb();
            });
        req.her = 1;

        process.nextTick(() => {
            req.abort();
        });
    };

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it('[actual] req.abort() should cause "abort" and "error" to be emitted', (done) => {
        nock("http://localhost:16829")
            .get("/status")
            .delayConnection(500)
            .reply(204);

        assertEvents(done);
    });

    it("abort is emitted before delay time", (done) => {
        nock("http://test.example.com")
            .get("/status")
            .delayConnection(500)
            .reply(204);

        const tstart = Date.now();
        const req = http.get("http://test.example.com/status")
            // Don't bother with the response
            .once("abort", () => {
                const actual = Date.now() - tstart;
                assert(actual < 250, `abort took only ${actual} ms`);
                done();
            })
            .once("error", (err) => {
                // don't care
            });

        setTimeout(() => {
            req.abort();
        }, 10);
    });

    it("Aborting an aborted request should not emit an error", (done) => {
        nock("http://test.example.com")
            .get("/status")
            .reply(200);

        let errorCount = 0;
        const req = http.get("http://test.example.com/status")
            .on("error", (err) => {
                errorCount++;
                if (errorCount < 3) {
                    // Abort 3 times at max, otherwise this would be an endless loop,
                    // if #882 pops up again.
                    req.abort();
                }
            });
        req.abort();

        // Give nock some time to fail
        setTimeout(() => {
            assert.equal(errorCount, 1, "Only one error should be sent.");
            done();
        }, 10);
    });
});
