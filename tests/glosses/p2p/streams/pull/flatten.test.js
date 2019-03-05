const {
    p2p: { stream: { pull } }
} = adone;

it("flatten arrays", (done) => {
    pull(
        pull.values([
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ]),
        pull.flatten(),
        pull.collect((err, numbers) => {
            assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9], numbers);
            done();
        })
    );
});

it("flatten - number of reads", (done) => {
    let reads = 0;
    pull(
        pull.values([
            pull.values([1, 2, 3])
        ]),
        pull.flatten(),
        pull.through(() => {
            reads++;
            // console.log("READ", reads);
        }),
        pull.take(2),
        pull.collect((err, numbers) => {
            assert.deepEqual([1, 2], numbers);
            assert.equal(reads, 2);
            done();
        })
    );

});
it("flatten stream of streams", (done) => {

    pull(
        pull.values([
            pull.values([1, 2, 3]),
            pull.values([4, 5, 6]),
            pull.values([7, 8, 9])
        ]),
        pull.flatten(),
        pull.collect((err, numbers) => {
            assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9], numbers);
            done();
        })
    );

});

it("flatten stream of broken streams", (done) => {
    const _err = new Error("I am broken"); let sosEnded;
    pull(
        pull.values([
            pull.error(_err)
        ], (err) => {
            sosEnded = err;
        }),
        pull.flatten(),
        pull.onEnd((err) => {
            assert.equal(err, _err);
            process.nextTick(() => {
                assert.equal(sosEnded, null, "should abort stream of streams");
                done();
            });
        })
    );
});

it("abort flatten", (done) => {
    let sosEnded; let s1Ended; let s2Ended;
    const read = pull(
        pull.values([
            pull.values([1, 2], (err) => {
                s1Ended = err; 
            }),
            pull.values([3, 4], (err) => {
                s2Ended = err; 
            })
        ], (err) => {
            sosEnded = err;
        }),
        pull.flatten()
    );
  
    read(null, (err, data) => {
        assert.notOk(err);
        assert.equal(data, 1);
        read(true, (err, data) => {
            assert.equal(err, true);
            process.nextTick(() => {
                assert.equal(sosEnded, null, "should abort stream of streams");
                assert.equal(s1Ended, null, "should abort current nested stream");
                assert.equal(s2Ended, undefined, "should not abort queued nested stream");
                done();
            });
        });
    });
});

it("abort flatten before 1st read", (done) => {
    let sosEnded; let s1Ended;
    const read = pull(
        pull.values([
            pull.values([1, 2], (err) => {
                s1Ended = err; 
            })
        ], (err) => {
            sosEnded = err;
        }),
        pull.flatten()
    );
  
    read(true, (err, data) => {
        assert.equal(err, true);
        assert.notOk(data);
        process.nextTick(() => {
            assert.equal(sosEnded, null, "should abort stream of streams");
            assert.equal(s1Ended, undefined, "should abort current nested stream");
            done();
        });
    });
});

it("flattern handles stream with normal objects", (done) => {
    pull(
        pull.values([
            [1, 2, 3], 4, [5, 6, 7], 8, 9, 10
        ]),
        pull.flatten(),
        pull.collect((err, ary) => {
            assert.deepEqual(ary, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            done();
        })
    );
});
