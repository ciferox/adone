const {
    is
} = adone;

// https://nodejs.org/api/addons.html#addons_context_aware_addons
it.todo("addon should be context-aware", async () => {
    const brotli1 = require("../");
    const buf1 = await brotli1.compress(Buffer.alloc(0));
    assert.ok(is.buffer(buf1));

    delete require.cache[require.resolve("..")];
    delete require.cache[require.resolve("../build/bindings/iltorb.node")];

    const brotli2 = require("../");
    const buf2 = await brotli2.compress(Buffer.alloc(0));
    assert.ok(is.buffer(buf2));
    assert.ok(Buffer.compare(buf1, buf2) === 0);
});
