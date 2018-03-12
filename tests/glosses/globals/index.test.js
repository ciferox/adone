const {
    is,
    globals
} = adone;

describe("globals", () => {
    it("main", () => {
        assert.true(is.plainObject(globals));
        assert.true(Object.keys(globals).length > 10 && Object.keys(globals).length < 1000);
    });

    it("ensure alphabetical order", () => {
        for (const env of Object.keys(globals)) {
            const keys = Object.keys(globals[env]);
            assert.deepEqual(keys.slice(), keys.sort((a, b) => a.localeCompare(b)), `The \`${env}\` keys don't have the correct alphabetical order`);
        }
    });
});
