const {
    p2p: { stream: { pull } }
} = adone;

it("unique", (done) => {
    const numbers = [1, 2, 2, 3, 4, 5, 6, 4, 0, 6, 7, 8, 3, 1, 2, 9, 0];

    pull(
        pull.values(numbers),
        pull.unique(),
        pull.collect((err, ary) => {
            assert.deepEqual(ary.sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            done();
        })
    );
});

it("non-unique", (done) => {
    const numbers = [1, 2, 2, 3, 4, 5, 6, 4, 0, 6, 7, 8, 3, 1, 2, 9, 0];

    pull(
        pull.values(numbers),
        pull.nonUnique(),
        pull.collect((err, ary) => {
            assert.deepEqual(ary.sort(), [0, 1, 2, 2, 3, 4, 6]);
            done();
        })
    );


});
