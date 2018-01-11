const {
    fast,
    fs,
    std
} = adone;

export default class NBuildTask extends adone.project.task.Base {
    async main(params) {
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

        // await tmp.unlink();
    }
}
