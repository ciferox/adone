const {
    error,
    realm: { code: { Sandbox, scope } },
    std: { path }
} = adone;

describe("Sandbox", () => {
    it("should throw with bad inputs", () => {
        assert.throws(() => new Sandbox(), error.NotValidException);
        assert.throws(() => new Sandbox({}), error.NotValidException);
        assert.throws(() => new Sandbox({ input: true }), error.NotValidException);
        assert.throws(() => new Sandbox({ input: "" }), error.NotValidException);
        assert.throws(() => new Sandbox({ input: [""] }), error.NotValidException);
    });

    it("defaults", () => {
        const sb = new Sandbox({ input: "1.js" });

        assert.equal(sb.cwd, process.cwd());
        assert.equal(sb.adonePath, adone.realm.rootRealm.ROOT_PATH);
        assert.sameMembers(sb.entries, [path.join(process.cwd(), "1.js")]);
        assert.instanceOf(sb.globalScope, scope.GlobalScope);
    });

    describe("public methods", () => {
        const methods = [
            "run",
            "loadAndCacheModule"
        ];

        const s = new Sandbox({ input: "1.js" });

        for (const m of methods) {
            it(`${m}()`, () => {
                assert.isFunction(s[m]);
            });
        }
    });
});
