describe("stream", "pull", "file", "partial", () => {
    const { stream: { pull } } = adone;
    const path = require("path");

    const cont = require("cont");
    const fs = require("fs");

    const crypto = require("crypto");
    const osenv = require("osenv");

    const tmpfile = path.join(osenv.tmpdir(), "test_pull-file_big");

    const big = crypto.pseudoRandomBytes(10 * 1024 * 1024);
    fs.writeFileSync(tmpfile, big);

    const hash = (data) => {
        return crypto.createHash("sha256").update(data).digest("hex");
    };

    const asset = (file) => {
        return path.join(__dirname, "assets", file);
    };

    const MB = 1024 * 1024;

    it("read files partially", (done) => {

        const test = (file, start, end) => {
            return function (cb) {
                const opts = { start, end };
                const _expected = fs.readFileSync(file, opts);

                const expected = _expected
                    .slice(
                        start || 0,
                        end || _expected.length
                    );

                pull(
                    pull.file(file, opts),
                    pull.collect((err, ary) => {
                        const actual = Buffer.concat(ary);
                        assert.equal(actual.length, expected.length);
                        assert.equal(hash(actual), hash(expected));
                        cb();
                    })
                );
            };

        };

        cont.para([
            test(tmpfile, 0, 9 * MB),
            test(tmpfile, 5 * MB, 10 * MB),
            test(tmpfile, 5 * MB, 6 * MB),
            test(asset("ipsum.txt")),
            test(asset("test.txt"), 1, 4)
        ])((err) => {
            done(err);
        });

    });
});
