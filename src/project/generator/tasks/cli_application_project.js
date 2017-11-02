const {
    fs,
    project,
    std
} = adone;

export default class CliApplicationProjectTask extends project.generator.task.Base {
    async run(input) {
        await this._runTask("defaultProject", {
            skipGit: true
        });

        const srcPath = std.path.join(this.context.project.cwd, "src");
        
        await fs.mkdirp(srcPath);

        await this._runTask("cliApplication", {
            name: this.context.project.name,
            fileName: "app.js",
            cwd: srcPath
        });

        // Update adone config
        await this._runTask("adoneConfig", {
            structure: {
                src: {
                    bin: {
                        $task: "transpileExe",
                        $src: "src/app.js",
                        $dst: "bin"
                    },
                    lib: {
                        $task: "transpile",
                        $src: [
                            "src/**/*",
                            "!src/app.js"
                        ],
                        $dst: "lib"
                    }
                }    
            },
            bin: "bin/app.js",
            main: "lib"
        });

        if (!this.context.flag.skipGit) {
            await this._runTask("git");
        }
    }
}
