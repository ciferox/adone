describe("stream", "pull", "file", "append", () => {
    const { stream: { pull } } = adone;
    const { file } = pull;

    let tmpdir;

    /**
     * @type {adone.fs.File}
     */
    let tmpfile;

    before(async () => {
        tmpdir = await adone.fs.Directory.createTmp();
        tmpfile = await tmpdir.addFile("hello");
    });

    after(async () => {
        await tmpdir.unlink();
    });

    it("append to a file", (done) => {
        let n = 10;
        let r = 0;
        let ended = false;

        (function next() {
            --n;
            adone.std.fs.appendFile(tmpfile.path(), `${Date.now()}\n`, (err) => {
                if (err) {
                    throw err;

                }

                if (n) {
                    setTimeout(next, 20);
                } else {
                    ended = true;
                }
            });
        })();

        pull(
            file(tmpfile.path(), { live: true }),
            pull.through((chunk) => {
                r++;
                assert.notEqual(chunk.length, 0);
            }),
            pull.take(10),
            pull.drain(null, (err) => {
                if (err) {
                    throw err;
                }
                assert.ok(ended);
                assert.equal(r, 10, "reads");
                done();
            })
        );
    });
});
