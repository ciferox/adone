describe("stream", "pull", "pushable", () => {
    const { stream: { pull } } = adone;
    const { pushable } = pull;

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

        assert.equal(typeof source, "function", "is a function");
        assert.equal(source.length, 2, "is a source stream");

        push(1);
        push(2);

        assert.deepEqual(buffer, [1, 2]);

        pull(
            source,
            pull.collect((err, data) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(data, [1, 2, 3], "got expected output");
                done();
            })
        );

        push(3);
        end();
    });

    describe("abort", () => {
        it("abort after a read", (done) => {
            const _err = new Error("test error");
            const s1 = spy();
            const s2 = spy();

            const p = pushable(s1);

            // manual read.
            p(null, s2);

            p(_err, () => {
                expect(s1).to.have.been.calledWith(_err);
                expect(s2).to.have.been.calledWith(_err);
                done();
            });
        });

        it("abort without a read", (done) => {
            const _err = new Error("test error");
            const s1 = spy();
            const p = pushable(s1);

            p(_err, () => {
                expect(s1).to.have.been.calledWith(_err);
                done();
            });
        });

        it("abort without a read, with data", (done) => {
            const _err = new Error("test error");
            const s1 = spy();
            const p = pushable(s1);

            p(_err, () => {
                expect(s1).to.have.been.calledWith(_err);
                done();
            });

            p.push(1);
        });
    });

    describe("end", () => {
        it("pushable", (done) => {
            const buf = pushable();

            assert.equal("function", typeof buf);
            assert.equal(2, buf.length);

            buf.push(1);
            buf.push(2);
            buf.push(3);
            buf.end();

            buf(null, (end, data) => {
                assert.equal(data, 1);
                assert.notOk(end);
                buf(null, (end, data) => {
                    assert.equal(data, 2);
                    assert.notOk(end);
                    buf(null, (end, data) => {
                        assert.equal(data, 3);
                        assert.notOk(end);
                        buf(null, (end, data) => {
                            assert.equal(data, undefined);
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
                assert.equal(i, 3);
                done();
            });

            pull(
                p,
                pull.take(3),
                pull.drain((d) => {
                    assert.equal(d, ++i);
                })
            );

            p.push(1);
            p.push(2);
            p.push(3);
            p.push(4);
            p.push(5);
        });
    });
});
