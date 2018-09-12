const {
    js: { compiler: { traverse: { Hub } } }
} = adone;

describe("js", "compiler", "traverse", "hub", () => {
    it.todo("default buildError should return TypeError", () => {
        const hub = new Hub();
        const msg = "test_msg";
        assert.deepEqual(hub.buildError(null, msg), new TypeError(msg));
    });
});
