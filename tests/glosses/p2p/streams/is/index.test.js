const {
    p2p: { stream: { pull, is } }
} = adone;

it("tests", () => {
    assert.ok(is.source(pull.values([])));
    assert.ok(is.sink(pull.drain()));
    assert.ok(is.duplex({ source: pull.values([]), sink: pull.drain() }));
});
