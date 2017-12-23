describe("stream", "pull", "defer", "through", () => {
    const { stream: { pull } } = adone;
    const { defer: { through: gate } } = pull;

    it("simple resolve after", (done) => {

        const g = gate();

        pull(
            pull.values([1, 2, 3, 4, 5]),
            g,
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                done();
            })
        );

        g.resolve(pull.map((e) => {
            return e * 5;
        }));

    });

    it("simple resolve before", (done) => {

        const g = gate();
        g.resolve(pull.map((e) => {
            return e * 5;
        }));

        pull(
            pull.values([1, 2, 3, 4, 5]),
            g,
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                done();
            })
        );

    });

    it("simple resolve mid", (done) => {

        const g = gate();

        const source = pull(pull.values([1, 2, 3, 4, 5]), g);

        g.resolve(pull.map((e) => {
            return e * 5;
        }));

        pull(source,
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                done();
            })
        );
    });

    it("resolve after read", (done) => {
        const g = gate();
        let resolved = false;

        pull(
            pull.values([1, 2, 3, 4, 5]),
            (read) => {
                return function (abort, cb) {
                    read(abort, (end, data) => {
                        if (!resolved) {
                            resolved = true;
                            g.resolve(pull.map((e) => {
                                return e * 5;
                            }));
                        }
                        cb(end, data);
                    });
                };
            },
            //peek always reads the first item, before it has been called.
            pull.peek(),
            g,
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                done();
            })
        );

    });

    it("peek with resume", (done) => {

        const defer = gate();

        pull(
            pull.values([1, 2, 3, 4, 5]),
            defer,
            pull.peek((end, data) => {
                assert.equal(data, 2);
                first = data;
            }),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.equal(first, 2);
                assert.deepEqual(ary, [2, 4, 6, 8, 10]);
                done();
            })
        );

        defer.resolve(pull.map((e) => {
            return e * 2;
        }));
    });
});
