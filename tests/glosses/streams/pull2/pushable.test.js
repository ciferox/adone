const {
    stream: { pull2: pull }
} = adone;
const { pushable } = pull;

describe("stream", "pull", "pushable", () => {
    it("pushable", (done) => {
        const buf = pushable();

        // should be a read function!

        assert.equal("function", typeof buf);
        assert.equal(2, buf.length);

        buf.push(1);

        assert.deepEqual(buf.buffer, [1]);

        pull(
            buf,
            pull.collect((end, array) => {
                // console.log(array);
                assert.deepEqual(array, [1, 2, 3]);
                done();
            })
        );

        // SOMETIMES YOU NEED PUSH!

        buf.push(2);
        buf.push(3);
        buf.end();
    });

    it("pushable with separated functions", (done) => {
        const { push, end, source, buffer } = pushable(true);

        expect(typeof source).to.equal("function");
        expect(source.length).to.equal(2);

        push(1);
        push(2);

        assert.deepEqual(buffer, [1, 2]);

        pull(
            source,
            pull.collect((err, data) => {
                if (err) {
                    throw err;
                }
                // console.log(data);
                expect(data).to.eql([1, 2, 3]);
                done();
            })
        );

        push(3);
        end();
    });

    describe("abort", () => {
        it("abort after a read", (done) => {
            const _err = new Error("test error");
            const p = pushable((err) => {
                // console.log("on close");
                assert.equal(err, _err);
            });

            // manual read.
            p(null, (err, data) => {
                // console.log("read cb");
                assert.equal(err, _err);
            });

            p(_err, () => {
                // console.log("abort cb");
                done();
            });
        });

        it("abort without a read", (done) => {
            const _err = new Error("test error");
            const p = pushable((err) => {
                // console.log("on close");
                assert.equal(err, _err);
            });

            p(_err, () => {
                // console.log("abort cb");
                done();
            });
        });

        it("abort without a read, with data", (done) => {
            const _err = new Error("test error");
            const p = pushable((err) => {
                // console.log("on close");
                assert.equal(err, _err);
            });

            p(_err, () => {
                // console.log("abort cb");
                done();
            });

            p.push(1);
        });

    });

    describe("end", () => {
        it("pushable", (done) => {
            const buf = pushable();

            expect("function").to.equal(typeof buf);
            expect(2).to.equal(buf.length);

            buf.push(1);
            buf.push(2);
            buf.push(3);
            buf.end();

            buf(null, (end, data) => {
                expect(data).to.equal(1);
                assert.notOk(end);
                buf(null, (end, data) => {
                    expect(data).to.equal(2);
                    assert.notOk(end);
                    buf(null, (end, data) => {
                        expect(data).to.equal(3);
                        assert.notOk(end);
                        buf(null, (end, data) => {
                            expect(data).to.equal(undefined);
                            assert.ok(end);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("take", () => {
        it("on close callback", (done) => {
            let i = 0;

            const p = pushable((err) => {
                if (err) {
                    throw err;
                }
                // console.log("ended", err);
                assert.equal(i, 3);
                done();
            });

            pull(
                p,
                pull.take(3),
                pull.drain((d) => {
                    // console.log(d);
                    assert.equal(d, ++i);
                }, console.log.bind(console, "end"))
            );

            p.push(1);
            p.push(2);
            p.push(3);
            p.push(4);
            p.push(5);
        });
    });
});
