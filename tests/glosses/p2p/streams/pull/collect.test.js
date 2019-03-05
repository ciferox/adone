const {
    p2p: { stream: { pull } }
} = adone;

it("collect empty", (done) => {
    pull(
        pull.empty(),
        pull.collect((err, ary) => {
            assert.notOk(err);
            assert.deepEqual(ary, []);
            done();
        })
    );
});
