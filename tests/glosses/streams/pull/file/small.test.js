describe("stream", "pull", "file", "small", () => {
    const path = require("path");

    const { stream: { pull } } = adone;
    const { file } = pull;

    it("small text", (done) => {
        pull(
            file(path.resolve(__dirname, "assets", "test.txt")),
            pull.map((data) => {
                return data.toString();
            }),
            pull.collect((err, items) => {
                assert.equal(items.join(""), "hello");
                done();
            })
        );
    });

    it("buffer size respected", (done) => {
        const expected = ["he", "ll", "o"];

        let i = 0;

        pull(
            file(path.resolve(__dirname, "assets", "test.txt"), { bufferSize: 2 }),
            pull.drain((data) => {
                assert.equal(data.toString(), expected.shift());
                if (++i === 3) {
                    done();
                }
            })
        );
    });
});
