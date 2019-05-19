const {
    sourcemap
} = adone;

it("test that the api is properly exposed in the top level", () => {
    assert.equal(typeof sourcemap.SourceMapGenerator, "function");
    assert.equal(typeof sourcemap.SourceMapConsumer, "function");
    assert.equal(typeof sourcemap.SourceNode, "function");
});
