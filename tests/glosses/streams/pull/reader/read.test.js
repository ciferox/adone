describe("stream", "pull", "reader", "read", () => {
    const split = require("pull-randomly-split");

    const {
        stream: { pull },
        std: { crypto }
    } = adone;


    const bytes = crypto.randomBytes(64);


    it("read once a stream", (done) => {

        const reader = pull.reader();

        pull(
            pull.values([bytes]),
            split(),
            reader
        );

        reader.read(32, (err, data) => {
            assert.notOk(err);
            assert.deepEqual(data, bytes.slice(0, 32));
            done();
        });

    });

    it("read twice from a stream", (done) => {

        const reader = pull.reader();

        pull(
            pull.values([bytes]),
            split(),
            reader
        );

        reader.read(32, (err, data) => {

            assert.notOk(err);
            assert.deepEqual(data, bytes.slice(0, 32));

            reader.read(16, (err, data) => {
                assert.notOk(err);
                assert.deepEqual(data, bytes.slice(32, 48));
                done();
            });
        });

    });

    it("read whatever is there", (done) => {

        const reader = pull.reader();

        pull(
            pull.values([bytes]),
            split(),
            reader
        );

        reader.read(null, (err, data) => {
            assert.notOk(err);
            assert.ok(data.length > 0);
            done();
        });

    });

    it("read a stream", (done) => {

        const reader = pull.reader();

        pull(
            pull.values([bytes]),
            split(),
            reader
        );

        pull(
            reader.read(),
            pull.collect((err, data) => {
                assert.notOk(err);
                const _data = Buffer.concat(data);
                assert.equal(_data.length, bytes.length);
                assert.deepEqual(_data, bytes);
                done();
            })
        );

    });

    it("async read", (done) => {

        const reader = pull.reader();

        pull(
            pull.values([Buffer.from("hello there")]),
            reader
        );

        setTimeout(() => {
            reader.read(6, (err, hello_) => {
                setTimeout(() => {
                    reader.read(5, (err, there) => {
                        if (err) {
                            throw new Error("unexpected end");
                        }
                        assert.deepEqual(Buffer.concat([hello_, there]).toString(), "hello there");
                        done();
                    });
                });
            });
        });

    });

    it("abort the stream", (done) => {

        const reader = pull.reader();

        pull(
            pull.hang((err) => {
                done();
            }),
            reader
        );

        reader.abort();

    });


    it("abort the stream and a read", (done) => {
        const reader = pull.reader();
        const err = new Error("intended");

        const s1 = spy();
        const s2 = spy();
        const s3 = spy();
        const s4 = spy();

        pull(
            pull.hang(() => {
                expect(s1).to.have.been.calledWith(err);
                expect(s2).to.have.been.calledWith(err);
                expect(s3).to.have.been.calledWith(err);
                expect(s4).to.have.been.calledWith(err);
                done();
            }),
            reader
        );

        reader.read(32, s1);
        reader.read(32, s2);
        reader.read(32, s3);
        reader.abort(err, s4);

    });

    it("if streaming, the stream should abort", (done) => {
        const reader = pull.reader();
        const err = new Error("intended");

        pull(pull.hang(), reader);

        pull(
            reader.read(),
            pull.collect((_err) => {
                assert.equal(_err, err);
                done();
            })
        );

        reader.abort(err);

    });

    it("abort stream once in streaming mode", (done) => {
        const reader = pull.reader();
        const err = new Error("intended");

        pull(pull.hang(), reader);

        const read = reader.read();

        read(true, (err) => {
            assert.ok(err);
            done();
        });

    });


    it("configurable timeout", (done) => {

        const reader = pull.reader(100);
        const start = Date.now();
        pull(pull.hang(), reader);

        pull(
            reader.read(),
            pull.collect((err) => {
                assert.ok(err);
                assert.ok(Date.now() < start + 300);
                done();
            })
        );

    });


    it("timeout does not apply to the rest of the stream", (done) => {
        const reader = pull.reader(100);
        let once = false;
        pull(
            (abort, cb) => {
                if (!once) {
                    setTimeout(() => {
                        once = true;
                        cb(null, Buffer.from("hello world"));
                    }, 200);
                } else {
                    cb(true);
                }
            },
            reader
        );

        pull(
            reader.read(),
            pull.collect((err, ary) => {
                assert.notOk(err);
                assert.equal(Buffer.concat(ary).toString(), "hello world");
                done();
            })
        );
    });
});
