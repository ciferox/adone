const {
    p2p: { stream: { pull } }
} = adone;

it("through - onEnd", (done) => {
    expect(2).checks(done);
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    //read values, and then just stop!
    //this is a subtle edge case for take!

    //I did have a thing that used this edge case,
    //but it broke take, actually. so removing it.
    //TODO: fix that thing - was a test for some level-db stream thing....

    //  pull.Source(function () {
    //    return function (end, cb) {
    //      if(end) cb(end)
    //      else if(values.length)
    //        cb(null, values.shift())
    //      else console.log('drop')
    //    }
    //  })()

    pull(
        pull.values(values),
        pull.take(10),
        pull.through(null, (err) => {
            // console.log("end");
            expect(true).to.be.true.mark();
            // process.nextTick(() => {
            //     done();
            // });
        }),
        pull.collect((err, ary) => {
            // console.log(ary);
            expect(true).to.be.true.mark();
        })
    );
});


it("take - exclude last (default)", (done) => {
    pull(
        pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pull.take((n) => {
            return n < 5; 
        }),
        pull.collect((err, four) => {
            assert.deepEqual(four, [1, 2, 3, 4]);
            done();
        })
    );
});
it("take - include last", (done) => {
    pull(
        pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pull.take((n) => {
            return n < 5; 
        }, { last: true }),
        pull.collect((err, five) => {
            assert.deepEqual(five, [1, 2, 3, 4, 5]);
            done();
        })
    );
});

it("take 5 causes 5 reads upstream", (done) => {
    let reads = 0;
    pull(
        pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        (read) => {
            return function (end, cb) {
                if (end !== true) {
                    reads++; 
                }
                // console.log(reads, end);
                read(end, cb);
            };
        },
        pull.take(5),
        pull.collect((err, five) => {
            assert.deepEqual(five, [1, 2, 3, 4, 5]);
            process.nextTick(() => {
                assert.equal(reads, 5);
                done();
            });
        })
    );
});

it("take doesn't abort until the last read", (done) => {

    let aborted = false;

    const ary = [1, 2, 3, 4, 5]; let i = 0;

    const read = pull(
        (abort, cb) => {
            if (abort) {
                cb(aborted = true); 
            } else if (i > ary.length) {
                cb(true); 
            } else {
                cb(null, ary[i++]); 
            }
        },
        pull.take((d) => {
            return d < 3;
        }, { last: true })
    );

    read(null, (_, d) => {
        assert.notOk(aborted, "hasn't aborted yet");
        read(null, (_, d) => {
            assert.notOk(aborted, "hasn't aborted yet");
            read(null, (_, d) => {
                assert.notOk(aborted, "hasn't aborted yet");
                read(null, (end, d) => {
                    assert.ok(end, "stream ended");
                    assert.equal(d, undefined, "data undefined");
                    assert.ok(aborted, "has aborted by now");
                    done();
                });
            });
        });
    });

});

it("take should throw error on last read", (done) => {
    let i = 0;
    const error = new Error("error on last call");
  
    pull(
        pull.values([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        pull.take((n) => {
            return n < 5; 
        }, { last: true }),
        // pull.take(5),
        pull.asyncMap((data, cb) => {
            setTimeout(() => {
                if (++i < 5) {
                    cb(null, data); 
                } else {
                    cb(error); 
                }
            }, 100);  
        }),
        pull.collect((err, five) => {
            assert.equal(err, error, "should return err");
            assert.deepEqual(five, [1, 2, 3, 4], "should skip failed item");
            done();
        })
    );
});
