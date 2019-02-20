const {
    fs,
    project,
    std
} = adone;

export default class OmnitronServiceProjectTask extends project.BaseTask {
    async main(input, context) {
        await this.runTask("defaultProject", {
            ...input,
            skipGit: true
        }, context);
        // Fix 'skipGit' flag
        context.flag.skipGit = input.skipGit;

        const srcPath = std.path.join(input.cwd, "src");

        await fs.mkdirp(srcPath);

        await this.runTask("omnitronService", {
            name: input.name,
            fileName: "index.js",
            cwd: srcPath
        }, context);

        // Update adone config
        await this.runTask("adoneConfig", {
            cwd: input.cwd,
            struct: {
                src: {
                    task: "transpile",
                    src: "src/**/*.js",
                    dst: "lib"
                }
            },
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
