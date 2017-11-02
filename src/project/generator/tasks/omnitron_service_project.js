const {
    fs,
    project,
    std
} = adone;

export default class OmnitronServiceProjectTask extends project.generator.task.Base {
    async run() {
        await this._runTask("defaultProject", {
            skipGit: true
        });

        const srcPath = std.path.join(this.context.project.cwd, "src");
        
        await fs.mkdirp(srcPath);

        await this._runTask("omnitronService", {
            name: this.context.project.name,
            fileName: "index.js",
            cwd: srcPath
        });

        // Update adone config
        await this._runTask("adoneConfig", {
            structure: {
                src: {
                    $task: "transpile",
                    $src: "src/**/*.js",
                    $dst: "lib"
                }    
            },
            main: "lib"
        });

        if (!this.context.flag.skipGit) {
            await this._runTask("git"
        );
        }
    }
}
