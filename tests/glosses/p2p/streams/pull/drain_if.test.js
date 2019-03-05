const {
    p2p: { stream: { pull } }
} = adone;

it("reduce becomes through", (done) => {
    pull(
        pull.values([1, 2, 3]),
        pull.reduce((a, b) => {
            return a + b; 
        }, 0, (err, val) => {
            assert.equal(val, 6);
            done();
        })
    );
});

it("reduce without initial value", (done) => {
    pull(
        pull.values([1, 2, 3]),
        pull.reduce((a, b) => {
            return a + b; 
        }, (err, val) => {
            assert.equal(val, 6);
            done();
        })
    );
});


it("reduce becomes drain", (done) => {
    pull(
        pull.values([1, 2, 3]),
        pull.reduce(
            (a, b) => {
                return a + b; 
            }, 
            0,
            (err, acc) => {
                assert.equal(acc, 6);
                done();
            }
        )
    );
});
