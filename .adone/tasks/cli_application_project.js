const {
    fs,
    project,
    std
} = adone;

export default class CliApplicationProjectTask extends project.BaseTask {
    async main(input, context) {
        await this.runTask("defaultProject", {
            ...input,
            skipGit: true
        }, context);
        // Fix 'skipGit' flag
        context.flag.skipGit = input.skipGit;

        const srcPath = std.path.join(input.cwd, "src");

        await fs.mkdirp(srcPath);

        await this.runTask("cliApplication", {
            name: input.name,
            fileName: "app.js",
            cwd: srcPath
        }, context);

        // Update adone config
        await this.runTask("adoneConfig", {
            cwd: input.cwd,
            struct: {
                app: {
                    task: "transpileExe",
                    src: "src/app.js",
                    dst: "bin"
                },
                lib: {
                    task: "transpile",
                    src: [
                        "src/**/*",
                        "!src/app.js"
                    ],
                    dst: "lib"
                }
            },
            bin: "bin/app.js",
            main: "lib"
        }, context);

        if (!input.skipJsconfig) {
            await this.runTask("jsconfig", {
                cwd: input.cwd,
                include: ["src"]
            }, context);
        }

        if (!input.skipGit) {
            await this.runTask("git", {}, context);
        }
    }
}
