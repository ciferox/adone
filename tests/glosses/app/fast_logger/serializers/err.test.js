const {
    app: { fastLogger: { stdSerializers: { err } } }
} = adone;

describe("app", "fastLogger", "serializers", "err", () => {
    it("serializes Error objects", () => {
        const serialized = err(Error("foo"));
        assert.equal(serialized.type, "Error");
        assert.equal(serialized.message, "foo");
        assert.notNull(serialized.stack.match(/err\.test\.js:/));
    });

    it("serializes Error objects with extra properties", () => {
        const e = Error("foo");
        e.statusCode = 500;
        const serialized = err(e);
        assert.equal(serialized.type, "Error");
        assert.equal(serialized.message, "foo");
        assert.ok(serialized.statusCode);
        assert.equal(serialized.statusCode, 500);
        assert.notNull(serialized.stack.match(/err\.test\.js:/));
    });

    it("serializes nested errors", () => {
        const e = Error("foo");
        e.inner = Error("bar");
        const serialized = err(e);
        assert.equal(serialized.type, "Error");
        assert.equal(serialized.message, "foo");
        assert.notNull(serialized.stack.match(/err\.test\.js:/));
        assert.equal(serialized.inner.type, "Error");
        assert.equal(serialized.inner.message, "bar");
        assert.notNull(serialized.inner.stack.match(/Error: bar/));
        assert.notNull(serialized.inner.stack.match(/err\.test\.js:/));
    });

    it("prevents infinite recursion", () => {
        const e = Error("foo");
        e.inner = e;
        const serialized = err(e);
        assert.equal(serialized.type, "Error");
        assert.equal(serialized.message, "foo");
        assert.notNull(serialized.stack.match(/err\.test\.js:/));
        assert.notOk(serialized.inner);
    });

    it("cleans up infinite recursion tracking", () => {
        const e = Error("foo");
        const bar = Error("bar");
        e.inner = bar;
        bar.inner = e;

        err(e);
        const serialized = err(e);

        assert.equal(serialized.type, "Error");
        assert.equal(serialized.message, "foo");
        assert.notNull(serialized.stack.match(/err\.test\.js:/));
        assert.ok(serialized.inner);
        assert.equal(serialized.inner.type, "Error");
        assert.equal(serialized.inner.message, "bar");
        assert.notNull(serialized.inner.stack.match(/Error: bar/));
        assert.notOk(serialized.inner.inner);
    });

    it("pass through anything that is not an Error", () => {
        const check = (a) => {
            assert.equal(err(a), a);
        };

        check("foo");
        check({ hello: "world" });
        check([1, 2]);
    });
});
