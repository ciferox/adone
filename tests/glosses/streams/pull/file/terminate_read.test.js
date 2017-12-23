describe("stream", "pull", "file", "terminate read", () => {
    const { stream: { pull } } = adone;
    const { file } = pull;

    const path = require("path");
    const fs = require("fs");

    const ipsum = path.resolve(__dirname, "assets", "ipsum.txt");

    it("can terminate read process", (done) => {

        const expected = [
            "Lorem ipsum dolor sit amet, consectetur ",
            "adipiscing elit. Quisque quis tortor eli",
            "t. Donec vulputate lacus at posuere soda",
            "les. Suspendisse cursus, turpis eget dap"
        ];

        pull(
            file(ipsum, { bufferSize: 40 }),
            pull.take(expected.length),
            pull.drain((data) => {
                assert.equal(data.toString(), expected.shift(), "line ok in drain");
            }, (err) => {
                if (err) {
                    throw err;
                }
                done();
            })
        );
    });

    it("can terminate file immediately (before open)", (done) => {

        const source = file(ipsum);
        let sync = false;
        source(true, (end) => {
            sync = true;
            assert.equal(end, true);
        });
        assert.ok(sync);
        done();

    });

    it("can terminate file immediately (after open)", (done) => {

        const source = file(ipsum);
        let sync1 = false;
        let sync2 = false;
        source(null, (end, data) => {
            if (sync1) {
                throw new Error("read1 called twice");
            }
            sync1 = true;
            assert.equal(end, true, "read aborted, end=true");
            assert.notOk(data, "read aborted, data = null");
        });
        source(true, (end) => {
            if (sync2) {
                throw new Error("read2 called twice");

            }
            sync2 = true;
            expect(sync1).to.be.true;
            assert.ok(sync1, "read cb was first");
            assert.equal(end, true);
            done();
        });
        assert.notOk(sync1);
        assert.notOk(sync2);

    });

    it("can terminate file during a read", (done) => {

        const source = file(ipsum, { bufferSize: 1024 });
        let sync1 = false;
        let sync2 = false;
        source(null, (end, data) => {
            assert.equal(end, null);
            assert.ok(data);
            source(null, (end, data) => {
                sync1 = true;
                assert.equal(end, true);
                assert.notOk(data, "data can't have been read");
            });
            source(true, (end) => {
                sync2 = true;
                assert.equal(end, true, "valid abort end");
                assert.ok(sync1, "read called back first");
                done();
            });
            assert.notOk(sync1);
            assert.notOk(sync2);
        });

    });

    //usually the read succeeds before the close does,
    //but not always
    it("after 10k times, cb order is always correct", (done) => {

        let C = 0;
        let R = 0;
        let T = 0;
        (function next() {
            T++;

            if (T > 10000) {
                assert.equal(R, 10000);
                assert.equal(C, 0);
                assert.equal(R + C, 10000);
                return done();
            }

            const fd = fs.openSync(__filename, "r+", 0o666);
            let data;
            let closed;

            //create a file stream with a fixed fd,
            //configured to automatically close (as by default)
            const source = file(null, { fd });

            //read.
            source(null, (err, _data) => {
                data = true;
                if (!closed) {
                    R++;

                }
                if (data && closed) {
                    next();

                }
            });

            //abort.
            source(true, (err) => {
                closed = true;
                if (!data) {
                    C ++;
                }
                if (data && closed) {
                    next();
                }
            });
        })();
    });
});
