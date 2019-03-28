

const test = require("tap").test;
const serializer = require("../lib/err");

test("serializes Error objects", (t) => {
    t.plan(3);
    const serialized = serializer(Error("foo"));
    t.is(serialized.type, "Error");
    t.is(serialized.message, "foo");
    t.match(serialized.stack, /err\.test\.js:/);
});

test("serializes Error objects with extra properties", (t) => {
    t.plan(5);
    const err = Error("foo");
    err.statusCode = 500;
    const serialized = serializer(err);
    t.is(serialized.type, "Error");
    t.is(serialized.message, "foo");
    t.ok(serialized.statusCode);
    t.is(serialized.statusCode, 500);
    t.match(serialized.stack, /err\.test\.js:/);
});

test("serializes nested errors", (t) => {
    t.plan(7);
    const err = Error("foo");
    err.inner = Error("bar");
    const serialized = serializer(err);
    t.is(serialized.type, "Error");
    t.is(serialized.message, "foo");
    t.match(serialized.stack, /err\.test\.js:/);
    t.is(serialized.inner.type, "Error");
    t.is(serialized.inner.message, "bar");
    t.match(serialized.inner.stack, /Error: bar/);
    t.match(serialized.inner.stack, /err\.test\.js:/);
});

test("prevents infinite recursion", (t) => {
    t.plan(4);
    const err = Error("foo");
    err.inner = err;
    const serialized = serializer(err);
    t.is(serialized.type, "Error");
    t.is(serialized.message, "foo");
    t.match(serialized.stack, /err\.test\.js:/);
    t.notOk(serialized.inner);
});

test("cleans up infinite recursion tracking", (t) => {
    t.plan(8);
    const err = Error("foo");
    const bar = Error("bar");
    err.inner = bar;
    bar.inner = err;

    serializer(err);
    const serialized = serializer(err);

    t.is(serialized.type, "Error");
    t.is(serialized.message, "foo");
    t.match(serialized.stack, /err\.test\.js:/);
    t.ok(serialized.inner);
    t.is(serialized.inner.type, "Error");
    t.is(serialized.inner.message, "bar");
    t.match(serialized.inner.stack, /Error: bar/);
    t.notOk(serialized.inner.inner);
});

test("pass through anything that is not an Error", (t) => {
    t.plan(3);

    function check(a) {
        t.is(serializer(a), a);
    }

    check("foo");
    check({ hello: "world" });
    check([1, 2]);
});
