const {
    fs,
    project,
    std
} = adone;

export default class OmnitronServiceProjectTask extends project.generator.task.Base {
    async run() {
        await this.runTask("defaultProject", {
            skipGit: true
        });

        const srcPath = std.path.join(this.context.project.cwd, "src");

        await fs.mkdirp(srcPath);

        await this.runTask("omnitronService", {
            name: this.context.project.name,
            fileName: "index.js",
            cwd: srcPath
        });

        // Update adone config
        await this.runTask("adoneConfig", {
            cwd: this.context.project.cwd,
            structure: {
                src: {
                    $task: "transpile",
                    $src: "src/**/*.js",
                    $dst: "lib"
                }
            },
            main: "lib"
        });

        if (!this.context.flag.skipJsconfig) {
            await this.runTask("jsconfig", {
                cwd: this.context.project.cwd,
                include: ["src"]
            });
        }

        if (!this.context.flag.skipGit) {
            await this.runTask("git");
        }
    }
}
