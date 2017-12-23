describe("stream", "pull", "hang", () => {
    const { stream: { pull } } = adone;
    const { hang } = pull;

    it("hang does nothing until you abort", (done) => {
        let aborted;
        let ended;
        const read = hang();

        read(null, (end) => {
            assert.ok(end);
            assert.ok(aborted);
            ended = true;
        });

        aborted = true;

        read(true, (end) => {
            assert.ok(ended);
            done();
        });

    });
});
