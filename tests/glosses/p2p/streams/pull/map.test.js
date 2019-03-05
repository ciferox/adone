const {
    p2p: { stream: { pull } }
} = adone;

it("map throughs ends stream", (done) => {
    const err = new Error("unwholesome number");
    pull(
        pull.values([1, 2, 3, 3.4, 4]),
        pull.map((e) => {
            if (e !== ~~e) {
                throw err; 
            }
        }),
        pull.drain(null, (_err) => {
            assert.equal(_err, err);
            done();
        })
    );
});
