describe("stream", "pull", "file", "fd", () => {
    const { stream: { pull } } = adone;
    const { file } = pull;

    const fs = require("fs");
    const path = require("path");

    const asset = (file) => {
        return path.join(__dirname, "assets", file);
    };

    const all = (stream, cb) => {
        pull(stream, pull.collect((err, ary) => {
            cb(err, Buffer.concat(ary));
        }));
    };

    it("can read a file with a provided fd", (done) => {

        const fd = fs.openSync(asset("ipsum.txt"), "r");

        all(file(null, { fd }), (err, buf) => {
            if (err) {
                throw err;

            }
            assert.ok(buf);
            done();
        });

    });


    it("two files can read from one fd if autoClose is disabled", (done) => {
        const fd = fs.openSync(asset("ipsum.txt"), "r");

        all(file(null, { fd, autoClose: false }), (err, buf1) => {
            if (err) {
                throw err;

            }
            assert.ok(buf1);
            all(file(null, { fd, autoClose: false }), (err, buf2) => {
                if (err) {
                    throw err;

                }
                assert.ok(buf2);
                assert.equal(buf1.toString(), buf2.toString());
                fs.close(fd, (err) => {
                    if (err) {
                        throw err;

                    }
                    done();
                });
            });
        });

    });
});
