const {
    stream: { pull }
} = adone;
const { catch: Catch } = pull;

describe("stream", "pull", "catch", () => {
    it("catch errors", (done) => {
        expect(2).checks(done);
        pull(
            pull.error(new Error("test")),
            Catch(function onErr(err) {
                expect(err.message).to.equal("test").mark();
            }),
            pull.collect((err, resp) => {
                expect(err).to.not.exist.mark();
            })
        );
    });

    it("return false to pass error", (done) => {
        pull(
            pull.error(new Error("test")),
            Catch((err) => {
                return false;
            }),
            pull.collect((err, res) => {
                expect(err.message).to.equal("test");
                done();
            })
        );
    });

    it("return truthy to emit one event then end", (done) => {
        pull(
            pull.error(new Error("test")),
            Catch((err) => {
                return "test data";
            }),
            pull.collect((err, res) => {
                expect(err).to.not.exist();
                assert.deepEqual(res, ["test data"], "should emit one event");
                done();
            })
        );
    });

    it("callback is optional", (done) => {
        pull(
            pull.error(new Error("test")),
            Catch(),
            pull.collect((err, res) => {
                assert.notExists(err, "should end stream without error");
                done();
            })
        );
    });
});
