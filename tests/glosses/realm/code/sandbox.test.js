const {
    error,
    realm: { code },
    std: { path }
} = adone;
const { Sandbox } = code;

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
        assert.equal(sb.adonePath, adone.realm.rootRealm.cwd);
        assert.sameMembers(sb.entries, [path.join(process.cwd(), "1.js")]);
        assert.instanceOf(sb.globalScope, code.GlobalScope);
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
