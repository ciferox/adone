const {
    is,
    sourcemap
} = adone;

it("api", () => {
    assert.isTrue(is.class(sourcemap.SourceMapGenerator));
    assert.isTrue(is.class(sourcemap.SourceMapConsumer));
    assert.isTrue(is.class(sourcemap.BasicSourceMapConsumer));
    assert.isTrue(is.class(sourcemap.IndexedSourceMapConsumer));
    assert.isTrue(is.class(sourcemap.SourceNode));
});
