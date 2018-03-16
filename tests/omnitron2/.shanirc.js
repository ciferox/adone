const {
    fs,
    realm
} = adone;

export default async (ctx) => {
    let realmPath;
    ctx.before(async () => {
        const runtimeRealmManager = await realm.getManager();

        realmPath = await fs.tmpName({
            prefix: "realm-"
        });

        const observer = await runtimeRealmManager.forkRealm({
            cwd: realmPath,
            name: "test"
        });
        const realmManager = await observer.result;

        // hijacking realm
        ctx.runtime.realmManager = realmManager;
        adone.runtime.realm.manager = realmManager;
        adone.runtime.realm.config = realmManager.config;
        adone.runtime.realm.identity = realmManager.config.identity.server;
    });

    ctx.after(async () => {
        // await fs.rm(realmPath);
    });
};
