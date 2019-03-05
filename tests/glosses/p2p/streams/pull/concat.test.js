const {
    p2p: { stream: { pull } }
} = adone;

it("concat", (done) => {
    let n = 0;
    pull(
        pull.values("hello there this is a test".split(/([aeiou])/)),
        pull.through(() => {
            n++;
        }), 
        pull.concat((err, mess) => {
            assert.equal(mess, "hello there this is a test");
            assert.equal(n, 17);
            done();
        })
    );

});
