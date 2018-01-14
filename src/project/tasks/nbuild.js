const {
    cmake: { BuildSystem },
    fast,
    is,
    fs,
    std
} = adone;

export default class NBuildTask extends adone.project.task.Base {
    async main(params) {
        if (is.string(params.native.type) && params.native.type == "gyp") {
            const tmp = new fs.Directory(await fs.tmpName({
                prefix: "nbuild-"
            }));
            await tmp.create();
            
            const gyp = new adone.gyp.Gyp();
            await gyp.run(["configure", "build"], {
                directory: tmp.path(),
                binding: std.path.join(this.manager.cwd, params.native.src)
            });

            await fast.src("*.node", {
                cwd: std.path.join(tmp.path(), "build", "Release")
            }).dest(std.path.join(this.manager.cwd, params.native.dst), {
                produceFiles: true
            });

            await tmp.unlink();
        } else {
            const cwd = process.cwd();
            const nativePath = std.path.join(this.manager.cwd, params.native.src);
            process.chdir(nativePath);
            const buildSystem = new BuildSystem();
            try {
                await buildSystem.build();
            } finally {
                process.chdir(cwd);
            }

            await fast.src("*.node", {
                cwd: std.path.join(nativePath, "build", "Release")
            }).dest(std.path.join(this.manager.cwd, params.native.dst), {
                produceFiles: true
            });
        }
    }
}
