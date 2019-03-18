const {
    cmake,
    fast,
    is,
    fs,
    realm: { BaseTask },
    std
} = adone;

const build = async function (manager, entry) {
    if (is.string(entry.native.type) && entry.native.type === "gyp") {
        const tmp = new fs.Directory(await fs.tmpName({
            prefix: "nbuild-"
        }));
        await tmp.create();

        const gyp = new adone.gyp.Gyp();
        await gyp.run(["configure", "build"], {
            directory: tmp.path(),
            binding: std.path.join(manager.cwd, entry.native.src)
        });

        await fast.src("*.node", {
            cwd: std.path.join(tmp.path(), "build", "Release")
        }).dest(std.path.join(manager.cwd, entry.native.dst), {
            produceFiles: true
        });

        await tmp.unlink();
    } else {
        const cwd = process.cwd();
        const nativePath = std.path.join(manager.cwd, entry.native.src);
        process.chdir(nativePath);
        const buildSystem = new cmake.BuildSystem();
        try {
            await buildSystem.build();
        } finally {
            process.chdir(cwd);
        }

        await fast.src("*.node", {
            cwd: std.path.join(nativePath, "build", "Release")
        }).dest(std.path.join(manager.cwd, entry.native.dst), {
            produceFiles: true
        });
    }
};

export default class extends BaseTask {
    async main(path) {
        const entries = this.manager.getEntries({
            path,
            onlyNative: true
        });

        if (entries.length === 0) {
            return null;
        }

        const observer = await adone.task.runParallel(this.manager, entries.map((entry) => ({
            task: build,
            args: [this.manager, entry]
        })));

        return observer.result;
    }
}
