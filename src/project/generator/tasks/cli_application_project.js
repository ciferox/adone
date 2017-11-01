const {
    fs,
    project,
    std
} = adone;

export default class CliApplicationProjectTask extends project.generator.task.Base {
    async run(input) {
        await this._runTask("defaultProject", {
            ...input,
            skipGit: true
        });

        const srcPath = std.path.join(input.cwd, "src");
        
        await fs.mkdirp(srcPath);

        await this._runTask("cliApplication", {
            ...input,
            fileName: "app.js",
            cwd: srcPath
        });

        // Update adone config
        await this._runTask("adoneConfig", {
            ...input,
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

        if (!input.skipGit) {
            await this._runTask("git", {
                cwd: input.cwd
            });
        }
    }
}
