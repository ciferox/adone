const {
    fast,
    nodejs,
    path,
    realm: { BaseTask }
} = adone;

@adone.task.task("cmake")
export default class extends BaseTask {
    async main({ src, dst, files } = {}) {
        const version = process.version;
        const realm = this.manager;

        const nodeManager = new nodejs.NodejsManager({
            realm
        });

        await nodeManager.download({
            version,
            type: "headers"
        });

        const nodePath = await nodeManager.extract({
            version,
            type: "headers"
        });

        await nodejs.cmake.configure({
            realm,
            path: src,
            nodePath
        });

        await nodejs.cmake.build({
            realm,
            path: src
        });

        const realmRootPath = realm.getPath();
        const buildPath = nodejs.cmake.getBuildPath(realm, src);

        let srcGlob;
        if (files) {
            srcGlob = files;
        } else {
            srcGlob = "*.node";
        }

        await fast.src(srcGlob, {
            cwd: path.join(buildPath, "Release")
        }).dest(path.join(realmRootPath, dst), {
            produceFiles: true
        });
    }
}