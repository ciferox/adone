const {
    fs,
    std,
    project
} = adone;

export default class EslintTask extends project.generator.task.Base {
    async run(info, context) {
        this.manager.notify(this, "progress", {
            message: "generating {bold}eslintrc{/bold} config"
        });
        const eslintrcPath = std.path.join(__dirname, "eslintrc.js_");

        await fs.copy(eslintrcPath, std.path.join(info.cwd, ".eslintrc.js"));
        const eslintConfig = adone.require(eslintrcPath);

        await this.runTask("npm", info, "install", {
            devDependencies: [
                "eslint",
                "babel-eslint",
                ...eslintConfig.plugins.map((name) => `eslint-plugin-${name}`)
            ]
        }, context);
    }
}
