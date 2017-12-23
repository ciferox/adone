describe("stream", "pull", "file", "large file", () => {
    const { stream: { pull } } = adone;
    const { file } = pull;

    const path = require("path");
    const crypto = require("crypto");
    const osenv = require("osenv");
    const fs = require("fs");

    const tmpfile = path.join(osenv.tmpdir(), "test_pull-file_big");

    const hash = (data) => {
        return crypto.createHash("sha256").update(data).digest("hex");
    };

    it("large file", (done) => {
        const big = crypto.pseudoRandomBytes(10 * 1024 * 1024);
        fs.writeFileSync(tmpfile, big);

        pull(
            file(tmpfile),
            pull.collect((err, items) => {
                assert.equal(hash(big), hash(Buffer.concat(items)));
                done();
            })
        );
    });


    it("large file as ascii strings", (done) => {
        const big = crypto.pseudoRandomBytes(10 * 1024 * 1024).toString("base64");
        fs.writeFileSync(tmpfile, big, "ascii");

        pull(
            file(tmpfile, { encoding: "ascii" }),
            pull.through((str) => {
                assert.equal(typeof str, "string");
            }),
            pull.collect((err, items) => {
                assert.equal(hash(big), hash(items.join("")));
                done();
            })
        );
    });
});
