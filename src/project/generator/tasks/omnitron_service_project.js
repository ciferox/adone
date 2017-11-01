const {
    fs,
    project,
    std
} = adone;

export default class OmnitronServiceProjectTask extends project.generator.task.Base {
    async run(input) {
        await this._runTask("defaultProject", {
            ...input,
            skipGit: true
        });

        const srcPath = std.path.join(input.cwd, "src");
        
        await fs.mkdirp(srcPath);

        await this._runTask("omnitronService", {
            ...input,
            fileName: "index.js",
            cwd: srcPath
        });

        // Update adone config
        await this._runTask("adoneConfig", {
            ...input,
            structure: {
                src: {
                    $task: "transpile",
                    $src: "src/**/*.js",
                    $dst: "lib"
                }    
            },
            main: "lib"
        });

        if (!input.skipGit) {
            await this._runTask("git", {
                cwd: input.cwd
            });
        }
    }
}
