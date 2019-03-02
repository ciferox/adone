const {
    fs,
    realm,
    std
} = adone;

export default async (ctx) => {
    let realmPath;

    ctx.timeout(70000);
    
    ctx.before(async () => {
        const runtimeRealmManager = realm.getManager();
        await runtimeRealmManager.initialize();

        realmPath = await fs.tmpName({
            prefix: "realm-"
        });

        const name = std.path.basename(realmPath);
        const basePath = std.path.dirname(realmPath);

        const observer = await runtimeRealmManager.forkRealm({
            basePath,
            name
        });
        await observer.result;
        const realmManager = new realm.Manager({
            cwd: realmPath
        });
        await realmManager.initialize();

        
        ctx.runtime.adoneRootPath = realmPath;
        ctx.runtime.realmManager = realmManager;

        // hijacking realm
        adone.realm.getRootRealm().manager = realmManager;
        adone.realm.getRootRealm().config = adone.runtime.config = realmManager.config;
        adone.realm.getRootRealm().identity = realmManager.config.identity.server;
    });

    ctx.after(async () => {
        // await fs.rm(realmPath);
    });
};
