const {
    database: { level: { backend: { LevelDB } } }
} = adone;

it("test database creation non-string location throws", () => {
    assert.throws(() => {
        new LevelDB({});
    }, /constructor requires a location string argument/, "non-string location leveldown() throws");
});
