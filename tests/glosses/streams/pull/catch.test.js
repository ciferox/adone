describe("stream", "pull", "catch", () => {
    const {
        stream: { pull }
    } = adone;

    it("catch errors", (done) => {
        pull(
            pull.error(new Error("test")),
            pull.catch(function onErr(err) {
                assert.equal(err.message, "test", "should callback with error");
            }),
            pull.collect((err, resp) => {
                done(err);
            })
        );
    });

    it("return false to pass error", (done) => {
        pull(
            pull.error(new Error("test")),
            pull.catch((err) => {
                return false;
            }),
            pull.collect((err, res) => {
                assert.equal(err.message, "test", "should pass error in stream");
                done();
            })
        );
    });

    it("return truthy to emit one event then end", (done) => {
        pull(
            pull.error(new Error("test")),
            pull.catch((err) => {
                return "test data";
            }),
            pull.collect((err, res) => {
                if (err) {
                    done(new Error("should not end with error"));
                }
                assert.deepEqual(res, ["test data"], "should emit one event");
                done();
            })
        );
    });

    it("callback is optional", (done) => {
        pull(
            pull.error(new Error("test")),
            pull.catch(),
            pull.collect((err, res) => {
                done(err);
            })
        );
    });
});
