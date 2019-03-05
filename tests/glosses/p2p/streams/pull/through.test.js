const {
    p2p: { stream: { pull } }
} = adone;

it("through - onEnd", (done) => {
    expect(2).checks(done);
    pull(
        pull.infinite(),
        pull.through(null, (err) => {
            // console.log("end");
            expect(true).to.be.true.mark();
            // process.nextTick(() => {
            //     t.end();
            // });
        }),
        pull.take(10),
        pull.collect((err, ary) => {
            // console.log(ary);
            expect(true).to.be.true.mark();
        })
    );
});
