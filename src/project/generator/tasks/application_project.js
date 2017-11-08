const {
    fs,
    project,
    std
} = adone;

export default class ApplicationProjectTask extends project.generator.task.Base {
    async run() {
        await this.runTask("defaultProject", {
            skipGit: true
        });

        const srcPath = std.path.join(this.context.project.cwd, "src");
        
        await fs.mkdirp(srcPath);

        await this.runTask("application", {
            name: this.context.project.name,
            fileName: "app.js",
            cwd: srcPath
        });

        // Update adone config
        await this.runTask("adoneConfig", {
            structure: {
                src: {
                    app: {
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

        if (!this.context.flag.skipJsconfig) {
            await this.runTask("jsconfig", {
                include: ["src"]
            });
        }

        if (!this.context.flag.skipGit) {
            await this.runTask("git");
        }
    }
}
