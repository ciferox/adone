const {
    p2p: { stream: { pull } }
} = adone;

it("filtered randomnes", (done) => {
    pull(
        pull.infinite(),
        pull.filter((d) => {
            // console.log("f", d);
            return d > 0.5;
        }),
        pull.take(100),
        pull.collect((err, array) => {
            assert.equal(array.length, 100);
            array.forEach((d) => {
                assert.ok(d > 0.5);
                assert.ok(d <= 1);
            });
            // console.log(array);
            done();
        })
    );
});

it("filter with regexp", (done) => {
    pull(
        pull.infinite(),
        pull.map((d) => {
            return Math.round(d * 1000).toString(16);
        }),
        pull.filter(/^[^e]+$/i), //no E
        pull.take(37),
        pull.collect((err, array) => {
            assert.equal(array.length, 37);
            // console.log(array);
            array.forEach((d) => {
                assert.equal(d.indexOf("e"), -1);
            });
            done();
        })
    );
});

it("inverse filter with regexp", (done) => {
    pull(
        pull.infinite(),
        pull.map((d) => {
            return Math.round(d * 1000).toString(16);
        }),
        pull.filterNot(/^[^e]+$/i), //no E
        pull.take(37),
        pull.collect((err, array) => {
            assert.equal(array.length, 37);
            array.forEach((d) => {
                assert.notEqual(d.indexOf("e"), -1);
            });
            done();
        })
    );
});

