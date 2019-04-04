const {
    realm
} = adone;

describe("realm", "code", "integration test", () => {
    describe("common namespaces inspection", () => {
        it("adone.app", async () => {
            const mod = new realm.code.Module({
                realm: realm.rootRealm,
                filePath: "src/glosses/app/index.js"
            });
            await mod.load();

            const modExports = mod.exports();

            assert.sameMembers(Object.keys(modExports), [
                "AppHelper",
                "Application",
                "STATE",
                "Subsystem",
                "command",
                "getSubsystemMeta",
                "lockfile",
                "mainCommand",
                "run",
                "runtime",
                "subsystem"
            ]);

            assert.isTrue(realm.code.isClass(modExports.Subsystem));
            assert.isTrue(realm.code.isClass(modExports.Application));
            assert.isTrue(realm.code.isClass(modExports.AppHelper));
            assert.isTrue(realm.code.isFunctionLike(modExports.run));
            assert.isTrue(realm.code.isFunctionLike(modExports.command));
            assert.isTrue(realm.code.isFunctionLike(modExports.mainCommand));
            assert.isTrue(realm.code.isFunctionLike(modExports.subsystem));
            assert.isTrue(realm.code.isObject(modExports.STATE));
            assert.isTrue(realm.code.isObject(modExports.runtime));
            // assert.isTrue(realm.code.isObject(modExports.lockfile));
        });
    });
});
