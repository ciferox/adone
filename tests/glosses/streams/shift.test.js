const { shift, through } = adone.stream;

describe("stream", "shift", () => {
    it("shifts next", () => {
        const passthrough = through.base();

        passthrough.write("hello");
        passthrough.write("world");

        assert.deepEqual(shift(passthrough), Buffer.from("hello"));
        assert.deepEqual(shift(passthrough), Buffer.from("world"));
    });

    it("shifts next with core", () => {
        const passthrough = new adone.std.stream.PassThrough();

        passthrough.write("hello");
        passthrough.write("world");

        assert.deepEqual(shift(passthrough), Buffer.from("hello"));
        assert.deepEqual(shift(passthrough), Buffer.from("world"));
    });

    it("shifts next with object mode", () => {
        const passthrough = through.base({ objectMode: true });

        passthrough.write({ hello: 1 });
        passthrough.write({ world: 1 });

        assert.deepEqual(shift(passthrough), { hello: 1 });
        assert.deepEqual(shift(passthrough), { world: 1 });
    });

    it("shifts next with object mode with core", () => {
        const passthrough = new adone.std.stream.PassThrough({ objectMode: true });

        passthrough.write({ hello: 1 });
        passthrough.write({ world: 1 });

        assert.deepEqual(shift(passthrough), { hello: 1 });
        assert.deepEqual(shift(passthrough), { world: 1 });
    });
});
