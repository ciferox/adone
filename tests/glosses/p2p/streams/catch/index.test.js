const {
    p2p: { stream: { pull: S, catch: Catch } }
} = adone;

describe("pull", "catch", () => {
    it("catch errors", (done) => {
        expect(2).checks(done);
        S(
            S.error(new Error("test")),
            Catch(function onErr(err) {
                expect(err.message).to.equal("test").mark();
            }),
            S.collect((err, resp) => {
                expect(err).to.not.exist.mark();
            })
        );
    });
    
    it("return false to pass error", (done) => {
        S(
            S.error(new Error("test")),
            Catch((err) => {
                return false;
            }),
            S.collect((err, res) => {
                expect(err.message).to.equal("test");
                done();
            })
        );
    });
    
    it("return truthy to emit one event then end", (done) => {
        S(
            S.error(new Error("test")),
            Catch((err) => {
                return "test data";
            }),
            S.collect((err, res) => {
                expect(err).to.not.exist();
                assert.deepEqual(res, ["test data"], "should emit one event");
                done();
            })
        );
    });
    
    it("callback is optional", (done) => {
        S(
            S.error(new Error("test")),
            Catch(),
            S.collect((err, res) => {
                assert.notExists(err, "should end stream without error");
                done();
            })
        );
    });    
});
