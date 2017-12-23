describe("stream", "pull", "reader", "state", () => {
    const {
        stream: { pull },
        std: { crypto }
    } = adone;

    const { reader } = pull;

    const bytes = crypto.randomBytes(64);

    it("read everything", () => {

        const state = reader.state();
        assert.notOk(state.has(1));
        state.add(bytes.slice(0, 32));
        assert.ok(state.has(1));
        assert.ok(state.has(32));
        assert.notOk(state.has(33));
        state.add(bytes.slice(32, 64));

        assert.deepEqual(state.get(64), bytes);
    });


    it("read overlapping sections", () => {
        const state = reader.state();
        assert.notOk(state.has(1));
        state.add(bytes);
        assert.ok(state.has(1));

        assert.deepEqual(state.get(48), bytes.slice(0, 48));
        assert.deepEqual(state.get(16), bytes.slice(48, 64));
    });

    it("read multiple sections", () => {
        const state = reader.state();
        assert.notOk(state.has(1));
        state.add(bytes);
        assert.ok(state.has(1));

        assert.deepEqual(state.get(20), bytes.slice(0, 20));
        assert.deepEqual(state.get(16), bytes.slice(20, 36));
        assert.deepEqual(state.get(28), bytes.slice(36, 64));
    });

    it("read overlaping sections", () => {
        const state = reader.state();
        assert.notOk(state.has(1));
        state.add(bytes.slice(0, 32));
        state.add(bytes.slice(32, 64));
        assert.ok(state.has(1));

        assert.deepEqual(state.get(31), bytes.slice(0, 31));
        assert.deepEqual(state.get(33), bytes.slice(31, 64));
    });

    it("read overlaping sections", () => {
        const state = reader.state();
        assert.notOk(state.has(1));
        state.add(bytes.slice(0, 32));
        state.add(bytes.slice(32, 64));
        assert.ok(state.has(1));

        assert.deepEqual(state.get(33), bytes.slice(0, 33));
        assert.deepEqual(state.get(31), bytes.slice(33, 64));
    });

    it("get whatever is left", () => {
        const state = reader.state();
        assert.notOk(state.has(1));
        state.add(bytes);
        assert.ok(state.has(bytes.length));
        const b = state.get();
        assert.deepEqual(b, bytes);
    });
});
