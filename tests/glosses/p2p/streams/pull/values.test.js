const {
    p2p: { stream: { pull } }
} = adone;

it("values - array", (done) => {
    pull(
        pull.values([1, 2, 3]),
        pull.collect((err, ary) => {
            assert.notOk(err);
            assert.deepEqual(ary, [1, 2, 3]);
            done();
        })
    );
});

it("values - object", (done) => {
    pull(
        pull.values({ a: 1, b: 2, c: 3 }),
        pull.collect((err, ary) => {
            assert.notOk(err);
            assert.deepEqual(ary, [1, 2, 3]);
            done();
        })
    );

});

it("values, abort", (done) => {
    expect(3).checks(done);

    const err = new Error("intentional");

    const read = pull.values([1, 2, 3], (err) => {
        done();
    });

    read(null, (_, one) => {
        expect(_).to.not.ok.mark();
        expect(one).to.equal(1).mark();
        read(err, (_err) => {
            expect(_err).to.equal(err).mark();
        });
    });

});
