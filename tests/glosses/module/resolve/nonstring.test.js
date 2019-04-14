const {
    module: { resolve }
} = adone;

it("nonstring", () => {
    assert.throws(() => resolve(555));
});
