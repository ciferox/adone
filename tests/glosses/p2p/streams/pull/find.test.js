const {
    p2p: { stream: { pull } }
} = adone;

it("find 7", (done) => {
    pull(
        pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pull.find((d) => {
            return d == 7;
        }, (err, seven) => {
            assert.equal(seven, 7);
            assert.notOk(err);
            done();
        })
    );
});

const target = Math.random();
it(`find ${target}`, (done) => {
    const f = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(Math.random);

    f.push(target);
    pull(
        pull.values(f.sort()),
        pull.find((d) => {
            return d == target;
        }, (err, found) => {
            assert.equal(found, target);
            assert.notOk(err);
            done();
        })
    );
});

it("find missing", (done) => {
    const f = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    pull(
        pull.values(f.sort()),
        pull.find((d) => {
            return d == target;
        }, (err, found) => {
            assert.equal(found, null);
            assert.notOk(err);
            done();
        })
    );
});


it("there can only be one", (done) => {

    pull(
        pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pull.asyncMap((e, cb) => {
            process.nextTick(() => {
                cb(null, e);
            });
        }),
        pull.find((d) => {
            return d >= 7;
        }, (err, seven) => {
            assert.equal(seven, 7);
            assert.notOk(err);
            done();
        })
    );

});

it("find null", (done) => {
    pull(
        pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pull.find(null, (err, first) => {
            assert.equal(first, 1);
            assert.notOk(err);
            done();
        })
    );
});
