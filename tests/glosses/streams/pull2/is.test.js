const {
    stream: { pull2: pull }
} = adone;

describe("stream", "pull", () => {
    it("is", () => {
        assert.ok(pull.is.source(pull.values([])));
        assert.ok(pull.is.sink(pull.drain()));
        assert.ok(pull.is.duplex({ source: pull.values([]), sink: pull.drain() }));
    });
});