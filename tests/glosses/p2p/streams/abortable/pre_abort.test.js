const {
    p2p: { stream: { abortable } }
} = adone;

describe("pull", "abortable", () => {
    it("normal end", () => {
        const _err = new Error("test error"); let ended;
        const a = abortable((err) => {
            assert.equal(err, _err);
            ended = true;
        });

        a.abort(_err);

        if (!ended) {
            throw new Error("expected onEnd to be called");
        }
    });
});
